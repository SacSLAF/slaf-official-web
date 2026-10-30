<?php

namespace App\Models;

class Event extends ContentModel
{
    public array $translatable = ['title', 'summary', 'body', 'venue'];

    protected function casts(): array
    {
        return [...parent::casts(), 'starts_at' => 'datetime', 'ends_at' => 'datetime'];
    }
}
