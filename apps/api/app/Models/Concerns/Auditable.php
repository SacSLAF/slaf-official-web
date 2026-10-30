<?php

namespace App\Models\Concerns;

use App\Services\Audit\AuditLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * Records create/update/delete of the model in the audit trail.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            app(AuditLogger::class)->log(
                $model->auditAction('created'), $model, [], $model->auditableValues($model->getAttributes())
            );
        });

        static::updated(function (Model $model) {
            $changes = array_diff_key($model->getChanges(), array_flip($model->auditIgnore()));

            if ($changes === []) {
                return;
            }

            $old = array_intersect_key($model->getRawOriginal(), $changes);

            app(AuditLogger::class)->log(
                $model->auditAction('updated'), $model, $model->auditableValues($old), $model->auditableValues($changes)
            );
        });

        static::deleted(function (Model $model) {
            app(AuditLogger::class)->log(
                $model->auditAction('deleted'), $model, $model->auditableValues($model->getRawOriginal()), []
            );
        });
    }

    protected function auditAction(string $event): string
    {
        return str($this->getMorphClass())->classBasename()->snake().'.'.$event;
    }

    /** Workflow bookkeeping columns are covered by explicit workflow.* entries. */
    protected function auditIgnore(): array
    {
        return ['updated_at', 'updated_by'];
    }

    /** Decode JSON (translatable) columns so the trail stays readable. */
    protected function auditableValues(array $values): array
    {
        $values = array_diff_key($values, array_flip($this->auditIgnore()));

        foreach ($values as $key => $value) {
            if (is_string($value) && str_starts_with($value, '{') && json_validate($value)) {
                $values[$key] = json_decode($value, true);
            }
        }

        return $values;
    }
}
