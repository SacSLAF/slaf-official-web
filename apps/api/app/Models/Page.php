<?php

namespace App\Models;

class Page extends ContentModel
{
    public array $translatable = ['title', 'summary', 'body'];
}
