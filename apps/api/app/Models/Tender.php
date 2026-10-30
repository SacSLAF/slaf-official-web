<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Tender extends ContentModel
{
    public array $translatable = ['title', 'summary', 'body'];

    protected function casts(): array
    {
        return [
            ...parent::casts(),
            'opens_at' => 'datetime',
            'closes_at' => 'datetime',
            'bid_security_lkr' => 'decimal:2',
        ];
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TenderDocument::class);
    }

    /** Effective state: an "open" tender past its closing time is shown as closed. */
    public function effectiveState(): string
    {
        return $this->tender_state === 'open' && $this->closes_at?->isPast() ? 'closed' : $this->tender_state;
    }
}
