<?php

namespace App\Models;

class Aircraft extends ContentModel
{
    protected $table = 'aircraft';

    public array $translatable = ['name', 'summary', 'body'];

    public function titleField(): string
    {
        return 'name';
    }
}
