<?php

namespace App\Http\Controllers\Admin;

use App\Content\ContentForm;
use App\Content\ContentPresenter;
use App\Content\ContentRegistry;
use App\Enums\ContentStatus;
use App\Http\Controllers\Controller;
use App\Models\ContentModel;
use App\Services\Workflow\WorkflowService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * CRUD + workflow transitions for every registered content type
 * (`/api/admin/content/{type}`), driven by {@see ContentRegistry}.
 */
class ContentController extends Controller
{
    public function __construct(
        private ContentForm $form,
        private ContentPresenter $presenter,
        private WorkflowService $workflow,
    ) {}

    /** Schemas for the types this user can see — the admin UI renders forms from these. */
    public function types(Request $request): JsonResponse
    {
        $user = $request->user();

        $types = collect(ContentRegistry::all())
            ->filter(fn ($def, $type) => $user->can("{$type}.view"))
            ->map(fn ($def, $type) => [
                'type' => $type,
                'label' => $def['label'],
                'singular' => $def['singular'],
                'fields' => $def['fields'],
                'can_create' => $this->workflow->canCreate($user, $type),
                'can_approve' => $user->can("{$type}.approve"),
            ])
            ->values();

        return response()->json(['data' => $types, 'locales' => ContentModel::LOCALES]);
    }

    public function index(Request $request, string $type): JsonResponse
    {
        $this->authorizePermission($request, "{$type}.view");
        $definition = ContentRegistry::get($type);
        $user = $request->user();

        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(ContentStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'mine' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        /** @var class-string<ContentModel> $model */
        $model = $definition['model'];
        $titleField = (new $model)->titleField();

        $query = $model::query()
            ->with(['creator:id,name', 'submitter:id,name', 'reviewer:id,name'])
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filters['q'] ?? null, fn ($q, $term) => $q->where(fn ($w) => $w
                ->where($titleField, 'like', '%'.addcslashes($term, '%_\\').'%')
                ->orWhere('slug', 'like', '%'.addcslashes($term, '%_\\').'%')))
            ->when($filters['mine'] ?? false, fn ($q) => $q->where('created_by', $user->id))
            ->when(($definition['scoped'] ?? false) && ! $user->can("{$type}.manage-all"),
                fn ($q) => $q->whereIn('id', $user->bases()->pluck('bases.id')))
            ->latest('updated_at');

        $page = $query->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn ($item) => $this->presenter->forAdmin($item, $user)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $this->authorizePermission($request, "{$type}.view");
        $item = $this->find($type, $id);

        if (! $this->workflow->inScope($request->user(), $type, $item)) {
            throw new AuthorizationException('This item is outside your assigned scope.');
        }

        return response()->json(['data' => $this->presenter->forAdmin($item, $request->user(), true)]);
    }

    public function store(Request $request, string $type): JsonResponse
    {
        $user = $request->user();

        if (! $this->workflow->canCreate($user, $type)) {
            throw new AuthorizationException('You are not authorised to create this content.');
        }

        $data = $request->validate($this->form->rules($type));
        $model = ContentRegistry::model($type);

        $item = DB::transaction(function () use ($type, $model, $data, $user) {
            $item = $this->form->fill($type, new $model, $data);
            $item->forceFill(['status' => ContentStatus::Draft, 'created_by' => $user->id, 'updated_by' => $user->id])->save();
            $item->recordRevision('create', $user);

            return $item;
        });

        return response()->json(['data' => $this->presenter->forAdmin($item->refresh(), $user, true)], 201);
    }

    public function update(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $item = $this->find($type, $id);
        $this->workflow->authorize($user, $item, 'update');

        $data = $request->validate($this->form->rules($type, $item));

        DB::transaction(function () use ($type, $item, $data, $user) {
            $this->form->fill($type, $item, $data);
            $item->forceFill(['updated_by' => $user->id])->save();
            $item->recordRevision('update', $user);
        });

        return response()->json(['data' => $this->presenter->forAdmin($item->refresh(), $user, true)]);
    }

    public function destroy(Request $request, string $type, int $id): JsonResponse
    {
        $item = $this->find($type, $id);
        $this->workflow->authorize($request->user(), $item, 'delete');
        $item->delete();

        return response()->json(null, 204);
    }

    public function transition(Request $request, string $type, int $id, string $action): JsonResponse
    {
        $user = $request->user();
        $item = $this->find($type, $id);

        $data = $request->validate([
            'comment' => [$action === 'reject' ? 'required' : 'nullable', 'string', 'max:2000'],
            'publish_at' => ['nullable', 'date', 'after_or_equal:now'],
        ]);
        $comment = isset($data['comment']) ? strip_tags($data['comment']) : null;

        $item = match ($action) {
            'submit' => $this->workflow->submit($item, $user),
            'approve' => $this->workflow->approve($item, $user, isset($data['publish_at']) ? Carbon::parse($data['publish_at']) : null, $comment),
            'reject' => $this->workflow->reject($item, $user, $comment),
            'withdraw' => $this->workflow->withdraw($item, $user, $comment),
            'archive' => $this->workflow->archive($item, $user, $comment),
            'restore' => $this->workflow->restore($item, $user),
            default => abort(404),
        };

        return response()->json(['data' => $this->presenter->forAdmin($item, $user, true)]);
    }

    public function revisions(Request $request, string $type, int $id): JsonResponse
    {
        $this->authorizePermission($request, "{$type}.view");
        $item = $this->find($type, $id);

        $revisions = $item->revisions()->with('user:id,name')->limit(50)->get()->map(fn ($r) => [
            'id' => $r->id,
            'event' => $r->event,
            'status' => $r->status,
            'data' => $r->data,
            'comment' => $r->comment,
            'user' => $r->user?->only(['id', 'name']),
            'created_at' => $r->created_at?->toIso8601String(),
        ]);

        // The last version that was live, so reviewers can diff pending changes against it.
        $published = $item->revisions()->where('event', 'approve')->first();

        return response()->json(['data' => $revisions, 'last_published' => $published?->data]);
    }

    /** Everything awaiting this user's review, across all types they can approve. */
    public function reviewQueue(Request $request): JsonResponse
    {
        $user = $request->user();
        $items = collect();

        foreach (ContentRegistry::all() as $type => $definition) {
            if (! $user->can("{$type}.approve")) {
                continue;
            }

            $definition['model']::query()
                ->with(['creator:id,name', 'submitter:id,name'])
                ->where('status', ContentStatus::InReview)
                ->oldest('submitted_at')
                ->limit(100)
                ->get()
                ->filter(fn ($item) => $this->workflow->inScope($user, $type, $item))
                ->each(fn ($item) => $items->push($this->presenter->forAdmin($item, $user)));
        }

        return response()->json(['data' => $items->sortBy('submitted_at')->values()]);
    }

    private function find(string $type, int $id): ContentModel
    {
        return ContentRegistry::model($type)::query()->findOrFail($id);
    }

    private function authorizePermission(Request $request, string $permission): void
    {
        ContentRegistry::get(explode('.', $permission)[0]);

        if (! $request->user()->can($permission)) {
            throw new AuthorizationException('You are not authorised to view this content.');
        }
    }
}
