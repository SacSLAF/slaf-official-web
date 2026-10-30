<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Base extends ContentModel
{
    public array $translatable = ['name', 'summary', 'body'];

    protected function casts(): array
    {
        return [...parent::casts(), 'latitude' => 'float', 'longitude' => 'float'];
    }

    public function titleField(): string
    {
        return 'name';
    }

    public function officers(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
