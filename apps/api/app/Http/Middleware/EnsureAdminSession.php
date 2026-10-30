<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Requires a fully authenticated (password + MFA) admin token on an active,
 * unlocked account. Optionally blocks everything except the password change
 * endpoint until a forced password change is completed.
 */
class EnsureAdminSession
{
    public function handle(Request $request, Closure $next, string $allowPendingPassword = ''): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active || $user->isLocked()) {
            $user?->currentAccessToken()?->delete();
            abort(401, 'Session is not valid.');
        }

        if (! $user->tokenCan('admin')) {
            abort(403, 'Two-factor authentication must be completed first.');
        }

        if ($user->must_change_password && $allowPendingPassword !== 'allow-pending-password') {
            abort(403, 'You must change your password before continuing.');
        }

        return $next($request);
    }
}
