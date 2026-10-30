<?php

namespace App\Models;

use App\Content\ContentRegistry;
use App\Enums\ContentStatus;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Translatable\HasTranslations;

/**
 * Base for all trilingual, maker-checker governed public content.
 *
 * @property ContentStatus $status
 */
abstract class ContentModel extends Model
{
    use Auditable, HasTranslations, SoftDeletes;

    public const LOCALES = ['en', 'si', 'ta'];

    /** @var list<string> */
    public array $translatable = [];

    protected $guarded = [
        'id', 'status', 'created_by', 'updated_by', 'submitted_by', 'submitted_at',
        'reviewed_by', 'reviewed_at', 'review_comment', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ContentStatus::class,
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /** Live on the public site: approved and past its publish time. */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where($this->qualifyColumn('status'), ContentStatus::Published)
            ->where($this->qualifyColumn('published_at'), '<=', now());
    }

    /** Eager-load the featured image for types that have one. */
    public function scopeWithImage(Builder $query): Builder
    {
        return $this->hasImage() ? $query->with('image') : $query;
    }

    public function hasImage(): bool
    {
        return ContentRegistry::field(ContentRegistry::typeFor($this), 'image_id') !== null;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'image_id');
    }

    public function revisions(): MorphMany
    {
        return $this->morphMany(ContentRevision::class, 'revisionable')->latest('id');
    }

    public function recordRevision(string $event, ?User $user, ?string $comment = null): ContentRevision
    {
        return $this->revisions()->create([
            'event' => $event,
            'status' => $this->status->value,
            'data' => $this->snapshot(),
            'user_id' => $user?->id,
            'comment' => $comment,
        ]);
    }

    /** Editable field values, translations expanded, for revision snapshots and diffs. */
    public function snapshot(): array
    {
        $data = $this->attributesToArray();

        foreach ($this->translatable as $field) {
            $data[$field] = $this->getTranslations($field);
        }

        return array_diff_key($data, array_flip([
            'id', 'status', 'created_by', 'updated_by', 'submitted_by', 'submitted_at', 'reviewed_by',
            'reviewed_at', 'review_comment', 'published_at', 'created_at', 'updated_at', 'deleted_at',
        ]));
    }

    /** The column holding the item's display title (title or name). */
    public function titleField(): string
    {
        return 'title';
    }

    public function displayTitle(string $locale = 'en'): string
    {
        return (string) $this->getTranslation($this->titleField(), $locale, true);
    }

    protected function auditIgnore(): array
    {
        return ['updated_at', 'updated_by'];
    }
}
