<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    private const MAX_EDGE = 2400;

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('media.manage'), 403);

        $page = Media::query()
            ->when($request->string('collection')->toString(), fn ($q, $c) => $q->where('collection', $c))
            ->latest()
            ->paginate(40);

        return response()->json([
            'data' => collect($page->items())->map(fn (Media $m) => [
                ...$m->present(),
                'alt' => $m->getTranslations('alt'),
                'original_name' => $m->original_name,
                'size' => $m->size,
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    /**
     * Images are decoded and re-encoded to WebP: this strips EXIF/GPS metadata
     * (important for operational photography) and neutralises polyglot files.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('media.manage'), 403);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:15360', 'dimensions:min_width=200,min_height=200,max_width=12000,max_height=12000'],
            'alt' => ['nullable', 'array:en,si,ta'],
            'alt.*' => ['nullable', 'string', 'max:255'],
            'collection' => ['nullable', 'string', 'in:general,news,aircraft,bases,events,gallery'],
        ]);

        $file = $data['file'];
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        if ($source === false) {
            throw ValidationException::withMessages(['file' => 'The image could not be read.']);
        }

        [$width, $height] = [imagesx($source), imagesy($source)];
        $scale = min(1, self::MAX_EDGE / max($width, $height));

        if ($scale < 1) {
            $resized = imagescale($source, (int) round($width * $scale), (int) round($height * $scale), IMG_BICUBIC);
            imagedestroy($source);
            $source = $resized;
            [$width, $height] = [imagesx($source), imagesy($source)];
        }

        ob_start();
        imagewebp($source, null, 82);
        $webp = ob_get_clean();
        imagedestroy($source);

        $path = 'media/'.now()->format('Y/m').'/'.Str::uuid().'.webp';
        Storage::disk('public')->put($path, $webp);

        $media = Media::create([
            'disk' => 'public',
            'path' => $path,
            'original_name' => Str::limit(basename($file->getClientOriginalName()), 200, ''),
            'mime_type' => 'image/webp',
            'size' => strlen($webp),
            'width' => $width,
            'height' => $height,
            'alt' => array_map('strip_tags', array_filter($data['alt'] ?? [])),
            'collection' => $data['collection'] ?? 'general',
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => [...$media->present(), 'alt' => $media->getTranslations('alt')]], 201);
    }

    public function destroy(Request $request, Media $media): JsonResponse
    {
        abort_unless($request->user()->can('media.manage'), 403);

        Storage::disk($media->disk)->delete($media->path);
        $media->delete();

        return response()->json(null, 204);
    }
}
