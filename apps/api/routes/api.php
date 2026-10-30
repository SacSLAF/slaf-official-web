<?php

use App\Content\ContentRegistry;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\OversightController;
use App\Http\Controllers\Admin\TenderDocumentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\PublicApi\ContentController;
use Illuminate\Support\Facades\Route;

$types = implode('|', ContentRegistry::types());
$locales = 'en|si|ta';

/*
|--------------------------------------------------------------------------
| Public, read-only API  (/api/v1)
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->middleware('throttle:public-api')->group(function () use ($types, $locales) {
    Route::get('{locale}/home', [ContentController::class, 'home'])->where('locale', $locales);
    Route::get('{locale}/search', [ContentController::class, 'search'])->where('locale', $locales)->middleware('throttle:public-search');
    Route::get('{locale}/{type}', [ContentController::class, 'index'])->where(['locale' => $locales, 'type' => $types]);
    Route::get('{locale}/{type}/{slug}', [ContentController::class, 'show'])
        ->where(['locale' => $locales, 'type' => $types, 'slug' => '[a-z0-9-]+']);

    Route::get('tenders/{slug}/documents/{document}', [ContentController::class, 'tenderDocument'])
        ->whereNumber('document')
        ->middleware('throttle:downloads')
        ->name('public.tender-document');
});

/*
|--------------------------------------------------------------------------
| Administrative API  (/api/admin) — network-restricted, MFA-only tokens
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware('admin.network')->group(function () use ($types) {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:admin-login');

    Route::middleware(['auth:sanctum', 'abilities:mfa', 'throttle:admin-mfa'])->group(function () {
        Route::post('auth/mfa/setup', [AuthController::class, 'setupMfa']);
        Route::post('auth/mfa/confirm', [AuthController::class, 'confirmMfa']);
        Route::post('auth/mfa/verify', [AuthController::class, 'verifyMfa']);
    });

    // Reachable while a forced password change is pending.
    Route::middleware(['auth:sanctum', 'admin.session:allow-pending-password'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:admin-mfa');
        Route::post('auth/logout', [AuthController::class, 'logout']);
    });

    Route::middleware(['auth:sanctum', 'admin.session', 'throttle:admin-api'])->group(function () use ($types) {
        Route::get('dashboard', [OversightController::class, 'dashboard']);

        Route::get('content-types', [AdminContentController::class, 'types']);
        Route::get('review-queue', [AdminContentController::class, 'reviewQueue']);
        Route::prefix('content/{type}')->where(['type' => $types])->group(function () {
            Route::get('/', [AdminContentController::class, 'index']);
            Route::post('/', [AdminContentController::class, 'store']);
            Route::get('{id}', [AdminContentController::class, 'show'])->whereNumber('id');
            Route::put('{id}', [AdminContentController::class, 'update'])->whereNumber('id');
            Route::delete('{id}', [AdminContentController::class, 'destroy'])->whereNumber('id');
            Route::get('{id}/revisions', [AdminContentController::class, 'revisions'])->whereNumber('id');
            Route::post('{id}/{action}', [AdminContentController::class, 'transition'])
                ->whereNumber('id')
                ->whereIn('action', ['submit', 'approve', 'reject', 'withdraw', 'archive', 'restore']);
        });

        Route::post('tenders/{tender}/documents', [TenderDocumentController::class, 'store']);
        Route::get('tenders/{tender}/documents/{document}', [TenderDocumentController::class, 'download']);
        Route::delete('tenders/{tender}/documents/{document}', [TenderDocumentController::class, 'destroy']);

        Route::get('media', [MediaController::class, 'index']);
        Route::post('media', [MediaController::class, 'store']);
        Route::delete('media/{media}', [MediaController::class, 'destroy']);

        Route::middleware('permission:users.manage')->group(function () {
            Route::get('users', [UserController::class, 'index']);
            Route::get('roles', [UserController::class, 'roles']);
            Route::post('users', [UserController::class, 'store']);
            Route::put('users/{user}', [UserController::class, 'update']);
            Route::post('users/{user}/reset-mfa', [UserController::class, 'resetMfa']);
            Route::post('users/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::post('users/{user}/unlock', [UserController::class, 'unlock']);
        });

        Route::middleware('permission:audit.view')->group(function () {
            Route::get('audit-logs', [OversightController::class, 'auditLogs']);
            Route::get('audit-logs/export', [OversightController::class, 'exportAuditLogs']);
            Route::post('audit-logs/verify', [OversightController::class, 'verifyAuditChain']);
        });

        Route::get('security-events', [OversightController::class, 'securityEvents'])->middleware('permission:security.view');
    });
});
