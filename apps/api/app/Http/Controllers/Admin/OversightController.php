<?php

namespace App\Http\Controllers\Admin;

use App\Content\ContentRegistry;
use App\Enums\ContentStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SecurityEvent;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Dashboard, audit trail and security monitoring. */
class OversightController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $content = [];

        foreach (ContentRegistry::all() as $type => $definition) {
            if (! $user->can("{$type}.view")) {
                continue;
            }

            $counts = $definition['model']::query()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status');

            $content[] = [
                'type' => $type,
                'label' => $definition['label'],
                'counts' => collect(ContentStatus::cases())->mapWithKeys(fn ($s) => [$s->value => (int) ($counts[$s->value] ?? 0)]),
            ];
        }

        $data = ['content' => $content];

        if ($user->can('security.view')) {
            $since = now()->subDays(13)->startOfDay();
            $data['security'] = [
                'failed_logins_24h' => SecurityEvent::where('type', SecurityEvent::LOGIN_FAILED)->where('created_at', '>=', now()->subDay())->count(),
                'mfa_failures_24h' => SecurityEvent::where('type', SecurityEvent::MFA_FAILED)->where('created_at', '>=', now()->subDay())->count(),
                'lockouts_24h' => SecurityEvent::where('type', SecurityEvent::LOGIN_LOCKED)->where('created_at', '>=', now()->subDay())->count(),
                'blocked_ips_24h' => SecurityEvent::where('type', SecurityEvent::IP_BLOCKED)->where('created_at', '>=', now()->subDay())->count(),
                'daily' => SecurityEvent::query()
                    ->whereIn('type', [SecurityEvent::LOGIN_FAILED, SecurityEvent::LOGIN_SUCCESS, SecurityEvent::MFA_FAILED])
                    ->where('created_at', '>=', $since)
                    ->get(['type', 'created_at'])
                    ->groupBy(fn ($e) => $e->created_at->toDateString())
                    ->map(fn ($day) => $day->countBy('type'))
                    ->sortKeys(),
            ];
        }

        if ($user->can('audit.view')) {
            $data['recent_activity'] = AuditLog::query()
                ->where('action', 'like', 'workflow.%')
                ->latest('id')
                ->limit(10)
                ->get(['id', 'user_name', 'action', 'auditable_type', 'auditable_id', 'new_values', 'created_at']);
            $data['audit_chain'] = Cache::get('audit-chain-status');
        }

        if ($user->can('system.view')) {
            $data['health'] = $this->health();
        }

        return response()->json(['data' => $data]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'subject_type' => ['nullable', 'string', 'max:120'],
            'subject_id' => ['nullable', 'integer'],
        ]);

        $page = $this->auditQuery($filters)->paginate(50);

        return response()->json([
            'data' => $page->items(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function exportAuditLogs(Request $request): StreamedResponse
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        app(AuditLogger::class)->log('audit.exported', null, [], $filters);

        return response()->streamDownload(function () use ($filters) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'created_at', 'user_id', 'user_name', 'action', 'subject_type', 'subject_id', 'ip_address', 'old_values', 'new_values', 'hash']);

            $this->auditQuery($filters)->lazyByIdDesc(500)->each(function ($log) use ($out) {
                fputcsv($out, [
                    $log->id, $log->created_at, $log->user_id, $log->user_name, $log->action,
                    $log->auditable_type, $log->auditable_id, $log->ip_address,
                    json_encode($log->old_values, JSON_UNESCAPED_UNICODE), json_encode($log->new_values, JSON_UNESCAPED_UNICODE), $log->hash,
                ]);
            });

            fclose($out);
        }, 'slaf-audit-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function verifyAuditChain(AuditLogger $audit): JsonResponse
    {
        $result = [...$audit->verify(), 'verified_at' => now()->toIso8601String()];
        Cache::forever('audit-chain-status', $result);

        return response()->json(['data' => $result]);
    }

    public function securityEvents(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['nullable', 'string', 'max:40'],
            'ip' => ['nullable', 'ip'],
            'email' => ['nullable', 'string', 'max:255'],
        ]);

        $page = SecurityEvent::query()
            ->when($filters['type'] ?? null, fn ($q, $t) => $q->where('type', $t))
            ->when($filters['ip'] ?? null, fn ($q, $ip) => $q->where('ip_address', $ip))
            ->when($filters['email'] ?? null, fn ($q, $e) => $q->where('email', 'like', "%{$e}%"))
            ->latest('id')
            ->paginate(50);

        return response()->json([
            'data' => $page->items(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    private function auditQuery(array $filters)
    {
        return AuditLog::query()
            ->when($filters['action'] ?? null, fn ($q, $a) => $q->where('action', 'like', addcslashes($a, '%_\\').'%'))
            ->when($filters['user_id'] ?? null, fn ($q, $u) => $q->where('user_id', $u))
            ->when($filters['from'] ?? null, fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($filters['to'] ?? null, fn ($q, $d) => $q->where('created_at', '<=', $d.' 23:59:59.999999'))
            ->when($filters['subject_type'] ?? null, fn ($q, $t) => $q->where('auditable_type', $t))
            ->when($filters['subject_id'] ?? null, fn ($q, $i) => $q->where('auditable_id', $i))
            ->latest('id');
    }

    private function health(): array
    {
        $dbOk = rescue(fn () => DB::select('select 1') !== [], false, false);
        $disk = storage_path();

        return [
            'database' => $dbOk ? 'ok' : 'down',
            'queue_pending' => rescue(fn () => DB::table('jobs')->count(), null, false),
            'queue_failed' => rescue(fn () => DB::table('failed_jobs')->count(), null, false),
            'disk_free_gb' => round(disk_free_space($disk) / 1024 ** 3, 1),
            'disk_total_gb' => round(disk_total_space($disk) / 1024 ** 3, 1),
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'environment' => app()->environment(),
        ];
    }
}
