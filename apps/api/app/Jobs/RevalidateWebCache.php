<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

/**
 * Tells the Next.js public site to drop cached pages for the given tags
 * (on-demand ISR), so approved content goes live immediately.
 */
class RevalidateWebCache implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public array $backoff = [5, 30, 120, 300];

    /** @param list<string> $tags */
    public function __construct(public array $tags) {}

    public function handle(): void
    {
        $url = config('services.web.revalidate_url');
        $secret = config('services.web.revalidate_secret');

        if (! $url || ! $secret) {
            return;
        }

        Http::timeout(10)
            ->withHeaders(['X-Revalidate-Secret' => $secret])
            ->post($url, ['tags' => $this->tags])
            ->throw();
    }
}
