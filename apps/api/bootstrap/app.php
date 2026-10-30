<?php

use App\Http\Middleware\EnsureAdminSession;
use App\Http\Middleware\RestrictAdminNetwork;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind the nginx reverse proxy; restrict to the proxy's address in production via TRUSTED_PROXIES.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '127.0.0.1'));

        $middleware->api(append: [SecurityHeaders::class]);

        $middleware->alias([
            'abilities' => CheckAbilities::class,
            'permission' => PermissionMiddleware::class,
            'admin.network' => RestrictAdminNetwork::class,
            'admin.session' => EnsureAdminSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(fn (UnauthorizedException $e, Request $request) => response()->json(
            ['message' => 'You are not authorised to perform this action.'], 403
        ));

        $exceptions->dontFlash(['password', 'password_confirmation', 'current_password', 'code', 'recovery_code']);
    })->create();
