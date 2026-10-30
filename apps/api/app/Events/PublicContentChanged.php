<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/** Fired when content enters or leaves the public site. */
class PublicContentChanged
{
    use Dispatchable;

    public function __construct(public string $type, public ?string $slug = null) {}
}
