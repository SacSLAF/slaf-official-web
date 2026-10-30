<?php

namespace App\Enums;

enum ContentStatus: string
{
    case Draft = 'draft';
    case InReview = 'in_review';
    case Rejected = 'rejected';
    case Published = 'published';
    case Archived = 'archived';

    /** Statuses in which a maker may still edit the content. */
    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Rejected], true);
    }

    public function isDeletable(): bool
    {
        return in_array($this, [self::Draft, self::Rejected, self::Archived], true);
    }
}
