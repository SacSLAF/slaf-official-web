<?php

namespace App\Providers;

use App\Models\SecurityEvent;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());

        // uncompromised() queries the HIBP k-anonymity API; only enforced in production.
        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()
            : Password::min(12)->mixedCase()->numbers()->symbols());

        // The API is called server-side over internal hostnames (api:8000, nginx:8081);
        // links it generates, such as tender downloads, must use the public URL.
        if (! $this->app->runningUnitTests() && ($url = config('app.url'))) {
            URL::forceRootUrl($url);
            URL::forceScheme(parse_url($url, PHP_URL_SCHEME) ?: 'https');
        }

        $this->configureRateLimiting();
        $this->configureTokenIdleTimeout();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('public-api', fn (Request $request) => Limit::perMinute(240)->by($request->ip()));
        RateLimiter::for('public-search', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('downloads', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        // Per account+IP and per IP, so neither credential stuffing nor targeted guessing scales.
        RateLimiter::for('admin-login', fn (Request $request) => [
            Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);
        RateLimiter::for('admin-mfa', fn (Request $request) => Limit::perMinute(6)->by($request->user()?->id ?: $request->ip()));
        RateLimiter::for('admin-api', fn (Request $request) => Limit::perMinute(300)->by($request->user()?->id ?: $request->ip()));
    }

    /**
     * Revoke admin tokens that have been idle too long. Sanctum calls this
     * before it refreshes last_used_at, so we see the previous activity time.
     */
    private function configureTokenIdleTimeout(): void
    {
        Sanctum::authenticateAccessTokensUsing(function (PersonalAccessToken $token, bool $isValid) {
            if (! $isValid || $token->name !== 'admin' || $token->last_used_at === null) {
                return $isValid;
            }

            if ($token->last_used_at->lt(now()->subMinutes((int) config('admin.idle_timeout')))) {
                SecurityEvent::record(SecurityEvent::SESSION_IDLE_EXPIRED, $token->tokenable);
                $token->delete();

                return false;
            }

            return true;
        });
    }
}
