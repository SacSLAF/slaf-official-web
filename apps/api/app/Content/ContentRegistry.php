<?php

namespace App\Content;

use App\Models\Aircraft;
use App\Models\Base;
use App\Models\ContentModel;
use App\Models\Event;
use App\Models\News;
use App\Models\Page;
use App\Models\Tender;
use Illuminate\Support\Arr;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Single source of truth for every governed content type: model, permission
 * prefix, field schema (drives validation, the admin form and public output).
 *
 * Field types: text, textarea, richtext (translatable when `translatable`),
 * slug, select, number, boolean, date, datetime, image, relation.
 */
class ContentRegistry
{
    public const PROVINCES = ['western', 'central', 'southern', 'northern', 'eastern', 'north_western', 'north_central', 'uva', 'sabaragamuwa'];

    /** @return array<string, array<string, mixed>> */
    public static function all(): array
    {
        $title = fn (string $name = 'title', string $label = 'Title') => [
            'name' => $name, 'label' => $label, 'type' => 'text', 'translatable' => true, 'required' => true, 'max' => 255, 'list' => true,
        ];
        $summary = ['name' => 'summary', 'label' => 'Summary', 'type' => 'textarea', 'translatable' => true, 'max' => 1000, 'list' => true];
        $body = ['name' => 'body', 'label' => 'Body', 'type' => 'richtext', 'translatable' => true, 'max' => 100000];
        $slug = ['name' => 'slug', 'label' => 'URL slug', 'type' => 'slug', 'help' => 'Leave blank to generate from the English title.'];
        $image = ['name' => 'image_id', 'label' => 'Featured image', 'type' => 'image', 'list' => true];
        $sort = ['name' => 'sort_order', 'label' => 'Sort order', 'type' => 'number', 'min' => 0, 'max' => 100000];

        return [
            'news' => [
                'model' => News::class,
                'label' => 'News & Press',
                'singular' => 'News article',
                'public' => true,
                'order' => ['published_at', 'desc'],
                'fields' => [
                    $title(),
                    $slug,
                    ['name' => 'category', 'label' => 'Category', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['news' => 'News', 'press_release' => 'Press release', 'humanitarian' => 'Humanitarian operation', 'feature' => 'Feature', 'sports' => 'Sports']],
                    $summary,
                    $body,
                    $image,
                    ['name' => 'base_id', 'label' => 'Related base', 'type' => 'relation', 'relation' => 'bases'],
                    ['name' => 'is_featured', 'label' => 'Feature on home page', 'type' => 'boolean', 'list' => true],
                ],
            ],
            'events' => [
                'model' => Event::class,
                'label' => 'Events',
                'singular' => 'Event',
                'public' => true,
                'order' => ['starts_at', 'asc'],
                'fields' => [
                    $title(),
                    $slug,
                    ['name' => 'starts_at', 'label' => 'Starts', 'type' => 'datetime', 'required' => true, 'list' => true],
                    ['name' => 'ends_at', 'label' => 'Ends', 'type' => 'datetime', 'after' => 'starts_at', 'list' => true],
                    ['name' => 'venue', 'label' => 'Venue', 'type' => 'text', 'translatable' => true, 'max' => 255, 'list' => true],
                    $summary,
                    $body,
                    $image,
                ],
            ],
            'tenders' => [
                'model' => Tender::class,
                'label' => 'Tenders & Procurement',
                'singular' => 'Tender notice',
                'public' => true,
                'order' => ['closes_at', 'desc'],
                'fields' => [
                    ['name' => 'reference_no', 'label' => 'Reference no.', 'type' => 'text', 'required' => true, 'max' => 80, 'unique' => true, 'list' => true],
                    $title(),
                    $slug,
                    ['name' => 'category', 'label' => 'Category', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['goods' => 'Goods', 'works' => 'Works', 'services' => 'Services', 'consultancy' => 'Consultancy', 'disposal' => 'Disposal / auction']],
                    ['name' => 'procurement_method', 'label' => 'Procurement method', 'type' => 'select',
                        'options' => ['ncb' => 'National Competitive Bidding', 'icb' => 'International Competitive Bidding', 'shopping' => 'Shopping', 'direct' => 'Direct contracting']],
                    ['name' => 'opens_at', 'label' => 'Bids open', 'type' => 'datetime', 'list' => true],
                    ['name' => 'closes_at', 'label' => 'Bids close', 'type' => 'datetime', 'required' => true, 'after' => 'opens_at', 'list' => true],
                    ['name' => 'bid_security_lkr', 'label' => 'Bid security (LKR)', 'type' => 'number', 'min' => 0, 'max' => 9999999999],
                    ['name' => 'tender_state', 'label' => 'Tender state', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['open' => 'Open', 'closed' => 'Closed', 'cancelled' => 'Cancelled', 'awarded' => 'Awarded']],
                    $summary,
                    $body,
                ],
            ],
            'bases' => [
                'model' => Base::class,
                'label' => 'Bases & Stations',
                'singular' => 'Base',
                'public' => true,
                'scoped' => true,
                'order' => ['sort_order', 'asc'],
                'fields' => [
                    $title('name', 'Name'),
                    $slug,
                    ['name' => 'base_type', 'label' => 'Type', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['headquarters' => 'Headquarters', 'base' => 'Air Force Base', 'station' => 'Air Force Station', 'academy' => 'Academy', 'training_school' => 'Training school']],
                    ['name' => 'province', 'label' => 'Province', 'type' => 'select', 'list' => true,
                        'options' => array_combine(self::PROVINCES, array_map(fn ($p) => str($p)->replace('_', ' ')->title()->toString(), self::PROVINCES))],
                    ['name' => 'latitude', 'label' => 'Latitude', 'type' => 'number', 'list' => true, 'min' => 5.8, 'max' => 10.0, 'step' => 0.000001],
                    ['name' => 'longitude', 'label' => 'Longitude', 'type' => 'number', 'list' => true, 'min' => 79.5, 'max' => 82.0, 'step' => 0.000001],
                    ['name' => 'established_year', 'label' => 'Established', 'type' => 'number', 'min' => 1940, 'max' => 2100],
                    $summary,
                    $body,
                    $image,
                    $sort,
                ],
            ],
            'aircraft' => [
                'model' => Aircraft::class,
                'label' => 'Aircraft Fleet',
                'singular' => 'Aircraft',
                'public' => true,
                'order' => ['sort_order', 'asc'],
                'fields' => [
                    $title('name', 'Name'),
                    $slug,
                    ['name' => 'role', 'label' => 'Role', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['fighter' => 'Fighter / ground attack', 'transport' => 'Transport', 'helicopter' => 'Helicopter', 'trainer' => 'Trainer', 'surveillance' => 'Surveillance / maritime patrol', 'uav' => 'Unmanned aerial vehicle']],
                    ['name' => 'manufacturer', 'label' => 'Manufacturer', 'type' => 'text', 'max' => 120, 'list' => true],
                    ['name' => 'origin_country', 'label' => 'Country of origin', 'type' => 'text', 'max' => 80],
                    ['name' => 'inducted_year', 'label' => 'Inducted', 'type' => 'number', 'min' => 1950, 'max' => 2100],
                    $summary,
                    $body,
                    $image,
                    $sort,
                ],
            ],
            'pages' => [
                'model' => Page::class,
                'label' => 'Pages',
                'singular' => 'Page',
                'public' => true,
                'order' => ['sort_order', 'asc'],
                'fields' => [
                    $title(),
                    $slug,
                    ['name' => 'section', 'label' => 'Section', 'type' => 'select', 'required' => true, 'list' => true,
                        'options' => ['about' => 'About SLAF', 'history' => 'History', 'command' => 'Command structure', 'services' => 'Public services', 'welfare' => 'Welfare & Seva Vanitha', 'sports' => 'Sports', 'careers' => 'Careers', 'legal' => 'Legal & policies']],
                    $summary,
                    $body,
                    $image,
                    $sort,
                ],
            ],
        ];
    }

    public static function get(string $type): array
    {
        return self::all()[$type] ?? throw new NotFoundHttpException("Unknown content type [{$type}].");
    }

    public static function types(): array
    {
        return array_keys(self::all());
    }

    /** @return class-string<ContentModel> */
    public static function model(string $type): string
    {
        return self::get($type)['model'];
    }

    public static function typeFor(ContentModel $model): string
    {
        foreach (self::all() as $type => $definition) {
            if ($model instanceof $definition['model']) {
                return $type;
            }
        }

        throw new \LogicException('Unregistered content model '.$model::class);
    }

    public static function fields(string $type): array
    {
        return self::get($type)['fields'];
    }

    public static function field(string $type, string $name): ?array
    {
        return Arr::first(self::fields($type), fn ($f) => $f['name'] === $name);
    }
}
