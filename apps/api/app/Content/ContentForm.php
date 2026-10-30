<?php

namespace App\Content;

use App\Models\ContentModel;
use App\Services\RichTextSanitizer;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Builds validation rules from the registry schema and fills models from
 * validated input (sanitising rich text, generating slugs).
 */
class ContentForm
{
    public function __construct(private RichTextSanitizer $sanitizer) {}

    public function rules(string $type, ?ContentModel $model = null): array
    {
        $definition = ContentRegistry::get($type);
        $table = (new $definition['model'])->getTable();
        $rules = [];

        foreach ($definition['fields'] as $field) {
            $name = $field['name'];
            $required = $field['required'] ?? false;

            if ($field['translatable'] ?? false) {
                $rules[$name] = [$required ? 'required' : 'nullable', 'array:'.implode(',', ContentModel::LOCALES)];

                foreach (ContentModel::LOCALES as $locale) {
                    $rules["{$name}.{$locale}"] = [
                        $required && $locale === 'en' ? 'required' : 'nullable',
                        'string',
                        'max:'.($field['max'] ?? 255),
                    ];
                }

                continue;
            }

            $base = [$required ? 'required' : 'nullable'];

            $rules[$name] = match ($field['type']) {
                'slug' => [...$base, 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique($table, 'slug')->ignore($model?->getKey())],
                'select' => [...$base, 'string', Rule::in(array_keys($field['options']))],
                'number' => [...$base, 'numeric', ...(isset($field['min']) ? ['min:'.$field['min']] : []), ...(isset($field['max']) ? ['max:'.$field['max']] : [])],
                'boolean' => ['sometimes', 'boolean'],
                'date', 'datetime' => [...$base, 'date', ...(isset($field['after']) ? ['after_or_equal:'.$field['after']] : [])],
                'image' => [...$base, 'integer', Rule::exists('media', 'id')],
                'relation' => [...$base, 'integer', Rule::exists($field['relation'], 'id')->whereNull('deleted_at')],
                default => [...$base, 'string', 'max:'.($field['max'] ?? 255), ...(($field['unique'] ?? false) ? [Rule::unique($table, $name)->ignore($model?->getKey())] : [])],
            };
        }

        return $rules;
    }

    public function fill(string $type, ContentModel $model, array $input): ContentModel
    {
        foreach (ContentRegistry::fields($type) as $field) {
            $name = $field['name'];

            if (! array_key_exists($name, $input)) {
                continue;
            }

            $value = $input[$name];

            if ($field['translatable'] ?? false) {
                $translations = [];

                foreach (ContentModel::LOCALES as $locale) {
                    $text = trim((string) ($value[$locale] ?? ''));

                    if ($text !== '') {
                        $translations[$locale] = $field['type'] === 'richtext' ? $this->sanitizer->clean($text) : strip_tags($text);
                    }
                }

                $model->setTranslations($name, $translations);
                // Drop locales removed in this edit (setTranslations only adds/overwrites).
                foreach (array_diff(ContentModel::LOCALES, array_keys($translations)) as $locale) {
                    $model->forgetTranslation($name, $locale);
                }

                continue;
            }

            $model->{$name} = match ($field['type']) {
                'boolean' => (bool) $value,
                'text', 'textarea' => $value === null ? null : strip_tags((string) $value),
                default => $value,
            };
        }

        if (blank($model->slug)) {
            $model->slug = $this->uniqueSlug($model, (string) $model->getTranslation($model->titleField(), 'en', false));
        }

        return $model;
    }

    private function uniqueSlug(ContentModel $model, string $title): string
    {
        $base = Str::slug($title) ?: Str::lower(Str::random(8));
        $base = Str::limit($base, 150, '');
        $slug = $base;
        $i = 2;

        while ($model->newQueryWithoutScopes()->where('slug', $slug)->whereKeyNot($model->getKey())->exists()) {
            $slug = "{$base}-".$i++;
        }

        return $slug;
    }
}
