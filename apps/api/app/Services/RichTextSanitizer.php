<?php

namespace App\Services;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * Allow-list sanitiser for editor HTML. Content is rendered on the public
 * site, so anything outside basic structural/formatting markup is dropped.
 */
class RichTextSanitizer
{
    private HtmlSanitizer $sanitizer;

    public function __construct()
    {
        $config = (new HtmlSanitizerConfig)
            ->allowSafeElements()
            ->allowElement('a', ['href', 'title'])
            ->allowElement('img', ['src', 'alt', 'width', 'height'])
            ->allowElement('figure')
            ->allowElement('figcaption')
            ->blockElement('div')
            ->blockElement('span')
            ->dropElement('style')
            ->dropElement('script')
            ->dropElement('iframe')
            ->allowLinkSchemes(['https', 'http', 'mailto', 'tel'])
            ->allowMediaSchemes(['https'])
            ->allowRelativeLinks()
            ->allowRelativeMedias()
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->withMaxInputLength(200_000);

        $this->sanitizer = new HtmlSanitizer($config);
    }

    public function clean(string $html): string
    {
        return trim($this->sanitizer->sanitize($html));
    }
}
