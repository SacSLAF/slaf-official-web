<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Two-step admin sign-in:
 *  1. POST /login with email + password  → short-lived token with only the `mfa` ability
 *  2. POST /mfa/verify (or /mfa/setup + /mfa/confirm on first sign-in) → full `admin` token
 *
 * The admin Next.js server keeps the token in an httpOnly cookie; it is never exposed to browser JS.
 */
class AuthController extends Controller
{
    private const MFA_TOKEN_MINUTES = 10;

    public function __construct(private TwoFactorService $twoFactor, private AuditLogger $audit) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $email = strtolower($credentials['email']);
        $user = User::where('email', $email)->first();

        if ($user?->isLocked()) {
            SecurityEvent::record(SecurityEvent::LOGIN_LOCKED, $user);
            $this->fail();
        }

        // Always run a hash check so response time doesn't reveal whether the account exists.
        $valid = Hash::check($credentials['password'], $user?->password ?? '$2y$12$'.str_repeat('x', 53));

        if (! $user || ! $valid || ! $user->is_active) {
            $user?->registerFailedLogin();
            SecurityEvent::record(SecurityEvent::LOGIN_FAILED, $user, $email, array_filter(['reason' => $user && ! $user->is_active ? 'inactive' : null]));

            if ($user?->isLocked()) {
                SecurityEvent::record(SecurityEvent::LOGIN_LOCKED, $user);
            }

            $this->fail();
        }

        $user->tokens()->where('name', 'mfa')->delete();
        $token = $user->createToken('mfa', ['mfa'], now()->addMinutes(self::MFA_TOKEN_MINUTES));

        return response()->json([
            'token' => $token->plainTextToken,
            'next' => $user->hasTwoFactorEnabled() ? 'mfa_challenge' : 'mfa_enrol',
            'expires_at' => $token->accessToken->expires_at->toIso8601String(),
        ]);
    }

    public function setupMfa(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            abort(409, 'Two-factor authentication is already enrolled. Ask a super administrator to reset it.');
        }

        return response()->json($this->twoFactor->beginEnrolment($user));
    }

    public function confirmMfa(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            abort(409, 'Two-factor authentication is already enrolled.');
        }

        $codes = $this->twoFactor->confirmEnrolment($user, $data['code']);

        if ($codes === null) {
            SecurityEvent::record(SecurityEvent::MFA_FAILED, $user, meta: ['stage' => 'enrol']);
            throw ValidationException::withMessages(['code' => 'The authentication code is invalid.']);
        }

        SecurityEvent::record(SecurityEvent::MFA_ENROLLED, $user);
        $this->audit->log('auth.mfa_enrolled', $user, actor: $user);

        return response()->json([...$this->issueSession($request, $user), 'recovery_codes' => $codes]);
    }

    public function verifyMfa(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required_without:recovery_code', 'nullable', 'string', 'max:10'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:20'],
        ]);
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            abort(409, 'Two-factor authentication is not enrolled.');
        }

        $ok = filled($data['code'] ?? null)
            ? $this->twoFactor->verifyCode($user, $data['code'])
            : $this->twoFactor->useRecoveryCode($user, $data['recovery_code']);

        if (! $ok) {
            $user->registerFailedLogin();
            SecurityEvent::record(SecurityEvent::MFA_FAILED, $user);

            if ($user->isLocked()) {
                SecurityEvent::record(SecurityEvent::LOGIN_LOCKED, $user);
                $user->tokens()->delete();
            }

            throw ValidationException::withMessages(['code' => 'The authentication code is invalid.']);
        }

        if (filled($data['recovery_code'] ?? null)) {
            SecurityEvent::record(SecurityEvent::MFA_RECOVERY_USED, $user, meta: ['remaining' => count($user->two_factor_recovery_codes ?? [])]);
        }

        return response()->json($this->issueSession($request, $user));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                ...$user->only(['id', 'name', 'email', 'service_number', 'rank', 'designation', 'must_change_password']),
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values(),
                'bases' => $user->bases()->get()->map(fn ($b) => ['id' => $b->id, 'name' => $b->displayTitle()]),
                'recovery_codes_remaining' => count($user->two_factor_recovery_codes ?? []),
                // The sign-in before this one, so users can spot activity that wasn't theirs.
                'last_login_at' => SecurityEvent::where('user_id', $user->id)
                    ->where('type', SecurityEvent::LOGIN_SUCCESS)
                    ->latest('id')->skip(1)->value('created_at')?->toIso8601String(),
            ],
            'session_expires_at' => $user->currentAccessToken()->expires_at?->toIso8601String(),
            'idle_timeout_minutes' => (int) config('admin.idle_timeout'),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'confirmed', 'different:current_password', Password::defaults()],
        ]);

        $user->forceFill([
            'password' => $data['password'],
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->saveQuietly();

        // Sign out every other session.
        $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();

        SecurityEvent::record(SecurityEvent::PASSWORD_CHANGED, $user);
        $this->audit->log('auth.password_changed', $user, actor: $user);

        return response()->json(['message' => 'Password changed.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        SecurityEvent::record(SecurityEvent::LOGOUT, $user);

        return response()->json(['message' => 'Signed out.']);
    }

    private function issueSession(Request $request, User $user): array
    {
        $user->tokens()->where('name', 'mfa')->delete();

        $user->forceFill([
            'failed_login_count' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->saveQuietly();

        $token = $user->createToken('admin', ['admin'], now()->addMinutes((int) config('admin.session_lifetime')));

        SecurityEvent::record(SecurityEvent::LOGIN_SUCCESS, $user);
        $this->audit->log('auth.login', $user, actor: $user);

        return [
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at->toIso8601String(),
            'must_change_password' => $user->must_change_password,
        ];
    }

    private function fail(): never
    {
        throw ValidationException::withMessages([
            'email' => 'These credentials are incorrect, or the account is temporarily locked.',
        ]);
    }
}
