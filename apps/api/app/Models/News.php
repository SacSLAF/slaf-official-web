<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class News extends ContentModel
{
    protected $table = 'news';

    public array $translatable = ['title', 'summary', 'body'];

    protected function casts(): array
    {
        return [...parent::casts(), 'is_featured' => 'boolean'];
    }

    public function base(): BelongsTo
    {
        return $this->belongsTo(Base::class);
    }
}
