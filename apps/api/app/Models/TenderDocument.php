<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Translatable\HasTranslations;

class TenderDocument extends Model
{
    use Auditable, HasTranslations;

    /** Tender documents live on the private disk and are streamed by the API. */
    public const DISK = 'local';

    public array $translatable = ['title'];

    protected $fillable = ['title', 'path', 'original_name', 'mime_type', 'size', 'sha256', 'uploaded_by'];

    protected $hidden = ['path'];

    public function tender(): BelongsTo
    {
        return $this->belongsTo(Tender::class);
    }
}
