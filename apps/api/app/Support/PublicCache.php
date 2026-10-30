<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Versioned cache for public API responses. Bumping the version on publish
 * invalidates everything at once without needing tag support in the store.
 */
class PublicCache
{
    private const VERSION_KEY = 'public-content-version';

    public const TTL = 300;

    public static function remember(string $key, Closure $callback): mixed
    {
        $version = Cache::get(self::VERSION_KEY, 1);

        return Cache::remember("public:v{$version}:{$key}", self::TTL, $callback);
    }

    public static function bump(): void
    {
        Cache::forever(self::VERSION_KEY, Cache::get(self::VERSION_KEY, 1) + 1);
    }
}
