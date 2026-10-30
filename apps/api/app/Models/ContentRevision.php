<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ContentRevision extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['event', 'status', 'data', 'user_id', 'comment'];

    protected function casts(): array
    {
        return ['data' => 'array'];
    }

    public function revisionable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
