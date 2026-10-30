<?php

namespace App\Http\Controllers\PublicApi;

use App\Content\ContentPresenter;
use App\Content\ContentRegistry;
use App\Http\Controllers\Controller;
use App\Models\ContentModel;
use App\Models\Event;
use App\Models\News;
use App\Models\Tender;
use App\Models\TenderDocument;
use App\Support\PublicCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read-only public API consumed by the Next.js site. Only published content
 * is ever returned; responses are cached and invalidated on publish.
 */
class ContentController extends Controller
{
    public function __construct(private ContentPresenter $presenter) {}

    public function index(Request $request, string $locale, string $type): JsonResponse
    {
        $definition = ContentRegistry::get($type);
        $filters = $request->validate([
            'page' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'category' => ['nullable', 'string', 'max:30', 'alpha_dash'],
            'section' => ['nullable', 'string', 'max:30', 'alpha_dash'],
            'role' => ['nullable', 'string', 'max:30', 'alpha_dash'],
            'state' => ['nullable', 'in:open,closed,cancelled,awarded'],
            'when' => ['nullable', 'in:upcoming,past'],
        ]);

        $key = "{$locale}:{$type}:index:".md5(json_encode($filters));

        $payload = PublicCache::remember($key, function () use ($definition, $filters, $locale) {
            /** @var Builder $query */
            $query = $definition['model']::query()->published()->withImage();
            [$column, $direction] = $definition['order'];

            foreach (['category', 'section', 'role'] as $filter) {
                if (isset($filters[$filter]) && ContentRegistry::field(ContentRegistry::typeFor($query->getModel()), $filter)) {
                    $query->where($filter, $filters[$filter]);
                }
            }

            if ($query->getModel() instanceof Tender && isset($filters['state'])) {
                match ($filters['state']) {
                    'open' => $query->where('tender_state', 'open')->where('closes_at', '>', now()),
                    'closed' => $query->where(fn ($q) => $q->where('tender_state', 'closed')
                        ->orWhere(fn ($q) => $q->where('tender_state', 'open')->where('closes_at', '<=', now()))),
                    default => $query->where('tender_state', $filters['state']),
                };
            }

            if ($query->getModel() instanceof Event && isset($filters['when'])) {
                $filters['when'] === 'upcoming'
                    ? $query->where('starts_at', '>=', now()->startOfDay())
                    : $query->where('starts_at', '<', now()->startOfDay())->reorder('starts_at', 'desc');
            }

            $page = $query->orderBy($column, $direction)->orderByDesc('id')->paginate($filters['per_page'] ?? 12);

            return [
                'data' => collect($page->items())->map(fn ($item) => $this->presenter->forPublic($item, $locale)),
                'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()],
            ];
        });

        return $this->cached($payload);
    }

    public function show(string $locale, string $type, string $slug): JsonResponse
    {
        $definition = ContentRegistry::get($type);

        $payload = PublicCache::remember("{$locale}:{$type}:show:{$slug}", function () use ($definition, $slug, $locale) {
            $item = $definition['model']::query()->published()->withImage()->where('slug', $slug)->first();

            return $item ? ['data' => $this->presenter->forPublic($item, $locale, true)] : null;
        });

        abort_if($payload === null, 404);

        return $this->cached($payload);
    }

    /** Aggregated data for the home page bento grid. */
    public function home(string $locale): JsonResponse
    {
        $payload = PublicCache::remember("{$locale}:home", function () use ($locale) {
            $present = fn ($items) => $items->map(fn ($i) => $this->presenter->forPublic($i, $locale))->values();

            return ['data' => [
                'featured' => $present(News::published()->with('image')->where('is_featured', true)->latest('published_at')->limit(3)->get()),
                'news' => $present(News::published()->with('image')->latest('published_at')->limit(6)->get()),
                'events' => $present(Event::published()->with('image')->where('starts_at', '>=', now()->startOfDay())->orderBy('starts_at')->limit(4)->get()),
                'tenders' => $present(Tender::published()->where('tender_state', 'open')->where('closes_at', '>', now())->orderBy('closes_at')->limit(5)->get()),
                'stats' => [
                    'open_tenders' => Tender::published()->where('tender_state', 'open')->where('closes_at', '>', now())->count(),
                ],
            ]];
        });

        return $this->cached($payload);
    }

    public function search(Request $request, string $locale): JsonResponse
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);
        $term = trim($data['q']);

        $payload = PublicCache::remember("{$locale}:search:".md5(mb_strtolower($term)), function () use ($term, $locale) {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $results = collect();

            foreach (ContentRegistry::all() as $type => $definition) {
                /** @var ContentModel $model */
                $model = new $definition['model'];
                $title = $model->titleField();

                $definition['model']::query()->published()->withImage()
                    ->where(fn ($q) => $q->where($title, 'like', $like)->orWhere('summary', 'like', $like))
                    ->latest('published_at')
                    ->limit(10)
                    ->get()
                    ->each(fn ($item) => $results->push($this->presenter->forPublic($item, $locale)));
            }

            return ['data' => $results->values(), 'meta' => ['query' => $term, 'total' => $results->count()]];
        });

        return response()->json($payload)->header('Cache-Control', 'public, max-age=60');
    }

    /** Streams a bid document of a published tender from the private disk. */
    public function tenderDocument(string $slug, int $document): StreamedResponse
    {
        $tender = Tender::published()->where('slug', $slug)->firstOrFail();
        $doc = TenderDocument::where('tender_id', $tender->id)->findOrFail($document);

        TenderDocument::withoutEvents(fn () => $doc->increment('download_count'));

        return Storage::disk(TenderDocument::DISK)->download($doc->path, $doc->original_name, [
            'Content-Type' => $doc->mime_type,
            'X-Content-SHA256' => $doc->sha256,
        ]);
    }

    private function cached(array $payload): JsonResponse
    {
        return response()->json($payload)->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
}
