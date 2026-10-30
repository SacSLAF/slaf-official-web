<?php

namespace App\Services\Workflow;

use App\Content\ContentRegistry;
use App\Enums\ContentStatus;
use App\Events\PublicContentChanged;
use App\Models\ContentModel;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Maker-checker state machine:
 *
 *   draft ──submit──▶ in_review ──approve──▶ published ──archive──▶ archived
 *     ▲                   │                      │                     │
 *     └──── rejected ◀─reject                 withdraw ──▶ draft ◀──restore
 *
 * An approver can never approve an item they created, edited or submitted —
 * this holds for super administrators too.
 */
class WorkflowService
{
    public function __construct(private AuditLogger $audit) {}

    /** @return array<string, bool> */
    public function abilities(User $user, ContentModel $model): array
    {
        $type = ContentRegistry::typeFor($model);
        $inScope = $this->inScope($user, $type, $model);
        $status = $model->status;
        $canApprove = $user->can("{$type}.approve") && $inScope;

        return [
            'update' => $user->can("{$type}.update") && $inScope && $status->isEditable(),
            'delete' => $user->can("{$type}.delete") && $inScope && $status->isDeletable(),
            'submit' => $user->can("{$type}.update") && $inScope && $status->isEditable(),
            'approve' => $canApprove && $status === ContentStatus::InReview && ! $this->isMaker($user, $model),
            'reject' => $canApprove && $status === ContentStatus::InReview && ! $this->isMaker($user, $model),
            'withdraw' => $canApprove && $status === ContentStatus::Published,
            'archive' => $canApprove && $status === ContentStatus::Published,
            'restore' => $canApprove && $status === ContentStatus::Archived,
        ];
    }

    public function canCreate(User $user, string $type): bool
    {
        $scoped = ContentRegistry::get($type)['scoped'] ?? false;

        return $user->can("{$type}.create") && (! $scoped || $user->can("{$type}.manage-all"));
    }

    public function inScope(User $user, string $type, ContentModel $model): bool
    {
        if (! (ContentRegistry::get($type)['scoped'] ?? false) || $user->can("{$type}.manage-all")) {
            return true;
        }

        return $user->bases()->whereKey($model->getKey())->exists();
    }

    public function isMaker(User $user, ContentModel $model): bool
    {
        return in_array($user->id, array_filter([$model->created_by, $model->updated_by, $model->submitted_by]), true);
    }

    public function authorize(User $user, ContentModel $model, string $ability): void
    {
        if ($this->abilities($user, $model)[$ability] ?? false) {
            return;
        }

        $type = ContentRegistry::typeFor($model);

        if (in_array($ability, ['approve', 'reject'], true) && $user->can("{$type}.approve") && $this->isMaker($user, $model)) {
            throw new AuthorizationException('Maker-checker: you cannot review content you created, edited or submitted.');
        }

        if (! $user->can($this->permissionFor($type, $ability)) || ! $this->inScope($user, $type, $model)) {
            throw new AuthorizationException('You are not authorised to perform this action.');
        }

        throw new ConflictHttpException("Cannot {$ability} content while it is ".str_replace('_', ' ', $model->status->value).'.');
    }

    public function submit(ContentModel $model, User $user): ContentModel
    {
        $this->authorize($user, $model, 'submit');

        return $this->transition($model, $user, 'submit', ContentStatus::InReview, [
            'submitted_by' => $user->id,
            'submitted_at' => now(),
            'review_comment' => null,
        ]);
    }

    public function approve(ContentModel $model, User $user, ?Carbon $publishAt = null, ?string $comment = null): ContentModel
    {
        $this->authorize($user, $model, 'approve');

        return $this->transition($model, $user, 'approve', ContentStatus::Published, [
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_comment' => $comment,
            'published_at' => $publishAt ?? ($model->published_at && $model->published_at->isFuture() ? $model->published_at : now()),
        ], $comment);
    }

    public function reject(ContentModel $model, User $user, string $comment): ContentModel
    {
        $this->authorize($user, $model, 'reject');

        return $this->transition($model, $user, 'reject', ContentStatus::Rejected, [
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_comment' => $comment,
        ], $comment);
    }

    public function withdraw(ContentModel $model, User $user, ?string $comment = null): ContentModel
    {
        $this->authorize($user, $model, 'withdraw');

        return $this->transition($model, $user, 'withdraw', ContentStatus::Draft, ['review_comment' => $comment], $comment);
    }

    public function archive(ContentModel $model, User $user, ?string $comment = null): ContentModel
    {
        $this->authorize($user, $model, 'archive');

        return $this->transition($model, $user, 'archive', ContentStatus::Archived, [], $comment);
    }

    public function restore(ContentModel $model, User $user): ContentModel
    {
        $this->authorize($user, $model, 'restore');

        return $this->transition($model, $user, 'restore', ContentStatus::Draft, []);
    }

    private function transition(ContentModel $model, User $user, string $event, ContentStatus $to, array $attributes, ?string $comment = null): ContentModel
    {
        $from = $model->status;
        $wasPublic = $from === ContentStatus::Published;

        DB::transaction(function () use ($model, $user, $event, $to, $attributes, $comment, $from) {
            $model->forceFill([...$attributes, 'status' => $to]);
            $model->saveQuietly();

            $model->recordRevision($event, $user, $comment);

            $this->audit->log("workflow.{$event}", $model, ['status' => $from->value], array_filter([
                'status' => $to->value,
                'comment' => $comment,
                'published_at' => $to === ContentStatus::Published ? $model->published_at : null,
            ]), $user);
        });

        if ($wasPublic || $to === ContentStatus::Published) {
            PublicContentChanged::dispatch(ContentRegistry::typeFor($model), $model->slug);
        }

        return $model->refresh();
    }

    private function permissionFor(string $type, string $ability): string
    {
        return match ($ability) {
            'submit' => "{$type}.update",
            'approve', 'reject', 'withdraw', 'archive', 'restore' => "{$type}.approve",
            default => "{$type}.{$ability}",
        };
    }
}
