<?php

namespace App\Http\Middleware;

use App\Models\SecurityEvent;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;
use Symfony\Component\HttpFoundation\Response;

/** Allow-lists the networks that may reach the administrative API. */
class RestrictAdminNetwork
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = config('admin.allowed_ips');

        if ($allowed && ! IpUtils::checkIp((string) $request->ip(), $allowed)) {
            SecurityEvent::record(SecurityEvent::IP_BLOCKED, meta: ['path' => $request->path()]);
            abort(404);
        }

        return $next($request);
    }
}
