<?php

namespace App\Content;

use App\Models\ContentModel;
use App\Models\Media;
use App\Models\Tender;
use App\Models\User;
use App\Services\Workflow\WorkflowService;

/**
 * Serialises content models for the public site (one locale, with English
 * fallback) and for the admin panel (all translations + workflow metadata).
 */
class ContentPresenter
{
    public function __construct(private WorkflowService $workflow) {}

    public function forPublic(ContentModel $model, string $locale, bool $detail = false): array
    {
        $type = ContentRegistry::typeFor($model);
        $out = [
            'id' => $model->id,
            'type' => $type,
            'slug' => $model->slug,
            'published_at' => $model->published_at?->toIso8601String(),
            'updated_at' => $model->updated_at?->toIso8601String(),
        ];

        foreach (ContentRegistry::fields($type) as $field) {
            $name = $field['name'];

            if (! $detail && ! ($field['list'] ?? false) && $field['type'] !== 'slug') {
                continue;
            }

            if ($field['translatable'] ?? false) {
                $value = $model->getTranslation($name, $locale, true);
                $out[$name] = $value === '' ? null : $value;

                if ($name === $model->titleField()) {
                    // Lets the web show a "not yet translated" notice and set lang= correctly.
                    $out['translated'] = $model->getTranslation($name, $locale, false) !== '';
                }

                continue;
            }

            $out[$name] = match ($field['type']) {
                'image' => $model->image?->present($locale),
                'date', 'datetime' => $model->{$name}?->toIso8601String(),
                'number' => $model->{$name} === null ? null : +$model->{$name},
                'slug' => $model->slug,
                'relation' => $model->{$name},
                default => $model->{$name},
            };
        }

        if ($model instanceof Tender) {
            $out['state'] = $model->effectiveState();

            if ($detail) {
                $out['documents'] = $model->documents->map(fn ($doc) => [
                    'id' => $doc->id,
                    'title' => $doc->getTranslation('title', $locale, true),
                    'file_name' => $doc->original_name,
                    'mime_type' => $doc->mime_type,
                    'size' => $doc->size,
                    'sha256' => $doc->sha256,
                    'download_url' => route('public.tender-document', [$model->slug, $doc->id]),
                ])->values();
            }
        }

        return $out;
    }

    public function forAdmin(ContentModel $model, User $user, bool $detail = false): array
    {
        $type = ContentRegistry::typeFor($model);
        $out = [
            'id' => $model->id,
            'type' => $type,
            'title' => $model->displayTitle(),
            'status' => $model->status->value,
            'created_by' => $model->creator?->only(['id', 'name']),
            'submitted_by' => $model->submitter?->only(['id', 'name']),
            'submitted_at' => $model->submitted_at?->toIso8601String(),
            'reviewed_by' => $model->reviewer?->only(['id', 'name']),
            'reviewed_at' => $model->reviewed_at?->toIso8601String(),
            'review_comment' => $model->review_comment,
            'published_at' => $model->published_at?->toIso8601String(),
            'created_at' => $model->created_at?->toIso8601String(),
            'updated_at' => $model->updated_at?->toIso8601String(),
            'can' => $this->workflow->abilities($user, $model),
        ];

        foreach (ContentRegistry::fields($type) as $field) {
            $name = $field['name'];

            if (! $detail && ! ($field['list'] ?? false) && $field['type'] !== 'slug') {
                continue;
            }

            $out['values'][$name] = match (true) {
                $field['translatable'] ?? false => (object) $model->getTranslations($name),
                in_array($field['type'], ['date', 'datetime'], true) => $model->{$name}?->toIso8601String(),
                default => $model->{$name},
            };
        }

        if ($detail) {
            $out['image'] = $model->hasImage() && $model->image_id ? Media::find($model->image_id)?->present() : null;

            if ($model instanceof Tender) {
                $out['documents'] = $model->documents->map(fn ($doc) => [
                    'id' => $doc->id,
                    'title' => $doc->getTranslations('title'),
                    'file_name' => $doc->original_name,
                    'mime_type' => $doc->mime_type,
                    'size' => $doc->size,
                    'sha256' => $doc->sha256,
                    'download_count' => $doc->download_count,
                    'created_at' => $doc->created_at?->toIso8601String(),
                ])->values();
            }
        }

        return $out;
    }
}
