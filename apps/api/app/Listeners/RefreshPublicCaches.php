<?php

namespace App\Listeners;

use App\Events\PublicContentChanged;
use App\Jobs\RevalidateWebCache;
use App\Support\PublicCache;

class RefreshPublicCaches
{
    public function handle(PublicContentChanged $event): void
    {
        PublicCache::bump();

        RevalidateWebCache::dispatch([$event->type, 'home', 'search'])->afterCommit();
    }
}
