<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Writes hash-chained audit records: each row's hash covers its own content
 * plus the previous row's hash, so any edit, deletion or re-ordering of
 * historical rows is detectable by {@see verify()}.
 */
class AuditLogger
{
    /** Attributes never written to the audit trail. */
    public const REDACTED = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
        'two_factor_last_timestep', 'updated_at',
    ];

    public function log(
        string $action,
        ?Model $subject = null,
        array $old = [],
        array $new = [],
        ?Model $actor = null,
    ): AuditLog {
        $actor ??= Auth::user();
        $request = app()->runningInConsole() && ! app()->runningUnitTests() ? null : request();

        $row = [
            'user_id' => $actor?->getKey(),
            'user_name' => $actor?->name ?? 'system',
            'action' => $action,
            'auditable_type' => $subject?->getMorphClass(),
            'auditable_id' => $subject?->getKey(),
            'old_values' => self::normalize(self::redact($old)),
            'new_values' => self::normalize(self::redact($new)),
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 500) : null,
            'created_at' => Carbon::now()->format('Y-m-d H:i:s.u'),
        ];

        return DB::transaction(function () use ($row) {
            // Serialise writers on the chain tail so two requests can't share a prev_hash.
            $prev = DB::table('audit_logs')->orderByDesc('id')->lockForUpdate()->value('hash');

            $row['prev_hash'] = $prev;
            $row['hash'] = self::hash($row);

            $id = DB::table('audit_logs')->insertGetId([
                ...$row,
                'old_values' => $row['old_values'] === null ? null : self::encode($row['old_values']),
                'new_values' => $row['new_values'] === null ? null : self::encode($row['new_values']),
            ]);

            return AuditLog::query()->findOrFail($id);
        });
    }

    /**
     * Walk the whole chain and report the first broken link, if any.
     *
     * @return array{valid: bool, checked: int, broken_at: int|null, reason: string|null}
     */
    public function verify(): array
    {
        $prev = null;
        $checked = 0;

        foreach (DB::table('audit_logs')->orderBy('id')->lazyById(500) as $row) {
            $checked++;

            $data = [
                'user_id' => $row->user_id,
                'user_name' => $row->user_name,
                'action' => $row->action,
                'auditable_type' => $row->auditable_type,
                'auditable_id' => $row->auditable_id,
                // Re-canonicalise: MySQL's JSON type reorders object keys on storage.
                'old_values' => $row->old_values === null ? null : self::normalize(json_decode($row->old_values, true)),
                'new_values' => $row->new_values === null ? null : self::normalize(json_decode($row->new_values, true)),
                'ip_address' => $row->ip_address,
                'user_agent' => $row->user_agent,
                'created_at' => Carbon::parse($row->created_at)->format('Y-m-d H:i:s.u'),
                'prev_hash' => $row->prev_hash,
            ];

            if ($row->prev_hash !== $prev) {
                return ['valid' => false, 'checked' => $checked, 'broken_at' => $row->id, 'reason' => 'Chain link mismatch (row removed or reordered).'];
            }

            if (! hash_equals($row->hash, self::hash($data))) {
                return ['valid' => false, 'checked' => $checked, 'broken_at' => $row->id, 'reason' => 'Row content does not match its hash (row modified).'];
            }

            $prev = $row->hash;
        }

        return ['valid' => true, 'checked' => $checked, 'broken_at' => null, 'reason' => null];
    }

    private static function hash(array $row): string
    {
        $payload = [
            $row['prev_hash'] ?? '',
            $row['user_id'] === null ? '' : (string) $row['user_id'],
            (string) $row['user_name'],
            $row['action'],
            (string) $row['auditable_type'],
            $row['auditable_id'] === null ? '' : (string) $row['auditable_id'],
            $row['old_values'] === null ? '' : self::encode($row['old_values']),
            $row['new_values'] === null ? '' : self::encode($row['new_values']),
            (string) $row['ip_address'],
            (string) $row['user_agent'],
            $row['created_at'],
        ];

        return hash('sha256', implode("\x1f", $payload));
    }

    private static function redact(array $values): array
    {
        return array_diff_key($values, array_flip(self::REDACTED));
    }

    /** Sort keys recursively and stringify scalars so the JSON round-trip is byte-stable. */
    private static function normalize(array $values): ?array
    {
        if ($values === []) {
            return null;
        }

        ksort($values);

        foreach ($values as $key => $value) {
            if (is_array($value)) {
                $values[$key] = self::normalize($value) ?? [];
            } elseif ($value instanceof \DateTimeInterface) {
                $values[$key] = $value->format(DATE_ATOM);
            } elseif ($value instanceof \BackedEnum) {
                $values[$key] = (string) $value->value;
            } elseif (is_bool($value)) {
                $values[$key] = $value ? '1' : '0';
            } elseif ($value !== null && ! is_string($value)) {
                $values[$key] = (string) $value;
            }
        }

        return $values;
    }

    private static function encode(array $values): string
    {
        return json_encode($values, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
