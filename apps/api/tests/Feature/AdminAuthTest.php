<?php

use App\Models\SecurityEvent;
use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

function login(string $email, string $password = 'password')
{
    return test()->postJson('/api/admin/auth/login', ['email' => $email, 'password' => $password]);
}

it('requires MFA enrolment after a correct password, then issues an admin session', function () {
    $user = staff('media-editor', ['two_factor_confirmed_at' => null]);

    $login = login($user->email)->assertOk()->assertJson(['next' => 'mfa_enrol']);
    $mfa = ['Authorization' => 'Bearer '.$login['token']];

    // The MFA-stage token cannot reach admin endpoints.
    $this->getJson('/api/admin/dashboard', $mfa)->assertForbidden();

    $setup = $this->postJson('/api/admin/auth/mfa/setup', [], $mfa)->assertOk();
    expect($setup['qr_svg'])->toContain('<svg');

    $code = app(Google2FA::class)->getCurrentOtp($setup['secret']);
    $confirm = $this->postJson('/api/admin/auth/mfa/confirm', ['code' => $code], $mfa)->assertOk();

    expect($confirm['recovery_codes'])->toHaveCount(8);
    expect($user->fresh()->hasTwoFactorEnabled())->toBeTrue();

    $this->getJson('/api/admin/dashboard', ['Authorization' => 'Bearer '.$confirm['token']])->assertOk();
});

it('verifies TOTP codes and rejects replay of the same code', function () {
    $secret = app(Google2FA::class)->generateSecretKey(32);
    $user = staff('media-editor', ['two_factor_secret' => $secret]);
    $code = app(Google2FA::class)->getCurrentOtp($secret);

    $token = login($user->email)->assertJson(['next' => 'mfa_challenge'])['token'];
    $this->postJson('/api/admin/auth/mfa/verify', ['code' => $code], ['Authorization' => "Bearer {$token}"])->assertOk();

    $token = login($user->email)['token'];
    $this->postJson('/api/admin/auth/mfa/verify', ['code' => $code], ['Authorization' => "Bearer {$token}"])
        ->assertUnprocessable();
});

it('accepts a recovery code exactly once', function () {
    $user = staff('media-editor', [
        'two_factor_secret' => app(Google2FA::class)->generateSecretKey(32),
        'two_factor_recovery_codes' => [hash('sha256', 'ABCDE-FGHIJ')],
    ]);

    $token = login($user->email)['token'];
    $this->postJson('/api/admin/auth/mfa/verify', ['recovery_code' => 'abcde-fghij'], ['Authorization' => "Bearer {$token}"])->assertOk();

    $token = login($user->email)['token'];
    $this->postJson('/api/admin/auth/mfa/verify', ['recovery_code' => 'ABCDE-FGHIJ'], ['Authorization' => "Bearer {$token}"])->assertUnprocessable();
});

it('locks the account after repeated failed passwords and logs it', function () {
    $user = staff('media-editor');

    foreach (range(1, User::MAX_FAILED_LOGINS) as $_) {
        login($user->email, 'wrong-password')->assertUnprocessable();
    }

    expect($user->fresh()->isLocked())->toBeTrue();

    // Even the correct password is refused while locked.
    $this->app['cache']->flush(); // clear the throttle so we test the lockout, not the rate limiter
    login($user->email)->assertUnprocessable();

    expect(SecurityEvent::where('type', SecurityEvent::LOGIN_FAILED)->count())->toBe(User::MAX_FAILED_LOGINS)
        ->and(SecurityEvent::where('type', SecurityEvent::LOGIN_LOCKED)->exists())->toBeTrue();
});

it('gives the same error for unknown accounts and wrong passwords', function () {
    $user = staff('media-editor');

    $unknown = login('nobody@slaf.test')->json('errors.email');
    $wrong = login($user->email, 'nope')->json('errors.email');

    expect($unknown)->toBe($wrong);
});

it('revokes admin sessions that sit idle beyond the timeout', function () {
    $user = staff('media-editor');
    $headers = adminHeaders($user);
    $user->tokens()->update(['last_used_at' => now()->subMinutes(config('admin.idle_timeout') + 1)]);

    $this->getJson('/api/admin/auth/me', $headers)->assertUnauthorized();
    expect($user->tokens()->count())->toBe(0);
});

it('forces a pending password change before any other admin action', function () {
    $user = staff('media-editor', ['must_change_password' => true]);
    $headers = adminHeaders($user);

    $this->getJson('/api/admin/dashboard', $headers)->assertForbidden();
    $this->getJson('/api/admin/auth/me', $headers)->assertOk()->assertJsonPath('user.must_change_password', true);

    $this->postJson('/api/admin/auth/password', [
        'current_password' => 'password',
        'password' => 'N3w-Strong-Passphrase!',
        'password_confirmation' => 'N3w-Strong-Passphrase!',
    ], $headers)->assertOk();

    $this->getJson('/api/admin/dashboard', $headers)->assertOk();
});

it('blocks the admin API outside the allowed networks', function () {
    config(['admin.allowed_ips' => ['10.10.0.0/16']]);

    login('anyone@slaf.test')->assertNotFound();
    expect(SecurityEvent::where('type', SecurityEvent::IP_BLOCKED)->exists())->toBeTrue();

    $this->withServerVariables(['REMOTE_ADDR' => '10.10.4.20']);
    login('anyone@slaf.test')->assertUnprocessable();
});
