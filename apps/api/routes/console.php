<?php

use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

Artisan::command('audit:verify', function (AuditLogger $audit) {
    $result = [...$audit->verify(), 'verified_at' => now()->toIso8601String()];
    Cache::forever('audit-chain-status', $result);

    if (! $result['valid']) {
        Log::critical('Audit log hash chain verification FAILED', $result);
        $this->error("Audit chain BROKEN at row {$result['broken_at']}: {$result['reason']}");

        return 1;
    }

    $this->info("Audit chain intact ({$result['checked']} rows verified).");
})->purpose('Verify the integrity of the hash-chained audit log');

Artisan::command('slaf:create-admin {email} {name}', function (string $email, string $name) {
    $password = Str::password(20);

    $user = User::create([
        'email' => strtolower($email),
        'name' => $name,
        'password' => $password,
        'must_change_password' => true,
    ]);
    $user->assignRole('super-admin');

    $this->info("Super administrator created: {$user->email}");
    $this->warn("Temporary password (shown once): {$password}");
    $this->line('The account must change this password and enrol TOTP MFA at first sign-in.');
})->purpose('Create a super administrator account (bootstrap)');

Schedule::command('audit:verify')->dailyAt('02:00');
Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('model:prune')->daily();
