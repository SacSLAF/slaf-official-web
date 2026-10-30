<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Spatie\Translatable\HasTranslations;

class Media extends Model
{
    use Auditable, HasTranslations;

    public array $translatable = ['alt'];

    protected $fillable = ['disk', 'path', 'original_name', 'mime_type', 'size', 'width', 'height', 'alt', 'collection', 'uploaded_by'];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function present(string $locale = 'en'): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url,
            'width' => $this->width,
            'height' => $this->height,
            'alt' => $this->getTranslation('alt', $locale, true) ?: null,
        ];
    }
}
