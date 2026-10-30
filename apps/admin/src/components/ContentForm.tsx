"use client";

import useSWR from "swr";
import { useState, type FormEvent } from "react";
import { fetcher, fromLocalInput, toLocalInput } from "@/lib/client";
import { LOCALES, type ContentTypeDef, type Field, type Locale, type MediaItem, type Paginated } from "@/lib/types";
import { ImageField } from "./MediaPicker";
import { RichText } from "./RichText";
import { Alert, Button, FieldShell, cx, inputClass } from "./ui";

type Values = Record<string, unknown>;
type Translations = Partial<Record<Locale, string>>;

/**
 * Renders a create/edit form from the API's field schema. Translatable fields
 * are edited one language at a time via the language tabs.
 */
export function ContentForm({
  def,
  initial,
  initialImage,
  disabled,
  onSubmit,
  submitLabel = "Save draft",
}: {
  def: ContentTypeDef;
  initial?: Values;
  initialImage?: MediaItem | null;
  disabled?: boolean;
  onSubmit: (values: Values) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Values>(() => initial ?? {});
  const [locale, setLocale] = useState<Locale>("en");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<MediaItem | null | undefined>(initialImage);

  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }));
  const setTranslation = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: { ...((v[name] as Translations) ?? {}), [locale]: value } }));

  const translatable = def.fields.filter((f) => f.translatable);
  const localeHasError = (l: Locale) => Object.keys(errors).some((k) => k.endsWith(`.${l}`));
  const completeness = (l: Locale) =>
    translatable.filter((f) => ((values[f.name] as Translations | undefined)?.[l] ?? "").trim() !== "").length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const e2 = err as { errors?: Record<string, string[]>; message: string };
      setErrors(e2.errors ?? {});
      setMessage(e2.message);
      const firstLocale = LOCALES.find((l) => Object.keys(e2.errors ?? {}).some((k) => k.endsWith(`.${l.code}`)));
      if (firstLocale) setLocale(firstLocale.code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {message && <Alert tone="error">{message}</Alert>}

      <div className="sticky top-0 z-10 -mx-5 border-b border-line bg-surface-raised/95 px-5 py-2 backdrop-blur">
        <div role="tablist" aria-label="Content language" className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="tab"
              aria-selected={locale === l.code}
              onClick={() => setLocale(l.code)}
              className={cx(
                "relative rounded-md px-3 py-1.5 text-sm",
                locale === l.code ? "bg-navy-800 font-semibold text-white" : "text-ink-muted hover:bg-surface-muted",
              )}
            >
              <span lang={l.lang}>{l.label}</span>
              <span className={cx("ml-2 text-xs", locale === l.code ? "text-navy-200" : "text-ink-muted")}>
                {completeness(l.code)}/{translatable.length}
              </span>
              {localeHasError(l.code) && <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-danger" aria-label="has errors" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {def.fields.map((field) => (
          <div key={field.name} className={cx(["richtext", "textarea", "image"].includes(field.type) || field.translatable ? "md:col-span-2" : "")}>
            <FieldInput
              field={field}
              locale={locale}
              value={values[field.name]}
              error={(errors[field.translatable ? `${field.name}.${locale}` : field.name] ?? errors[field.name])?.[0]}
              disabled={disabled}
              onChange={(v) => (field.translatable ? setTranslation(field.name, v as string) : set(field.name, v))}
              image={image}
              onImage={(id, item) => {
                set(field.name, id);
                setImage(item);
              }}
            />
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="flex justify-end border-t border-line pt-5">
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

function FieldInput({
  field,
  locale,
  value,
  error,
  disabled,
  onChange,
  image,
  onImage,
}: {
  field: Field;
  locale: Locale;
  value: unknown;
  error?: string;
  disabled?: boolean;
  onChange: (v: unknown) => void;
  image?: MediaItem | null;
  onImage: (id: number | null, item?: MediaItem | null) => void;
}) {
  const id = `f-${field.name}${field.translatable ? `-${locale}` : ""}`;
  const lang = LOCALES.find((l) => l.code === locale)!.lang;
  const required = field.required && (!field.translatable || locale === "en");
  const label = field.translatable ? `${field.label} (${LOCALES.find((l) => l.code === locale)!.label})` : field.label;
  const text = field.translatable ? ((value as Translations | undefined)?.[locale] ?? "") : ((value as string | null) ?? "");

  let control;
  switch (field.type) {
    case "richtext":
      control = <RichText key={locale} id={id} lang={lang} value={text} onChange={onChange} disabled={disabled} />;
      break;
    case "textarea":
      control = (
        <textarea id={id} lang={lang} rows={3} maxLength={field.max} value={text} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      );
      break;
    case "select":
      control = (
        <select id={id} value={(value as string) ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || null)} className={inputClass}>
          <option value="">— Select —</option>
          {Object.entries(field.options ?? {}).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      );
      break;
    case "number":
      control = (
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={(value as number | null) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={inputClass}
        />
      );
      break;
    case "boolean":
      control = (
        <label className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={!!value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-navy-700" />
          Yes
        </label>
      );
      break;
    case "datetime":
    case "date":
      control = (
        <input
          id={id}
          type={field.type === "date" ? "date" : "datetime-local"}
          value={toLocalInput(value as string | null)}
          disabled={disabled}
          onChange={(e) => onChange(fromLocalInput(e.target.value))}
          className={inputClass}
        />
      );
      break;
    case "image":
      control = <ImageField value={(value as number | null) ?? null} preview={image} onChange={onImage} disabled={disabled} />;
      break;
    case "relation":
      control = <RelationSelect id={id} relation={field.relation!} value={(value as number | null) ?? null} onChange={onChange} disabled={disabled} />;
      break;
    default:
      control = (
        <input
          id={id}
          lang={field.translatable ? lang : undefined}
          type="text"
          maxLength={field.type === "slug" ? 160 : field.max}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cx(inputClass, field.type === "slug" && "font-mono")}
          placeholder={field.type === "slug" ? "auto-generated" : undefined}
        />
      );
  }

  return (
    <FieldShell label={label} htmlFor={id} required={required} error={error} help={field.help}>
      {control}
    </FieldShell>
  );
}

function RelationSelect({
  id,
  relation,
  value,
  onChange,
  disabled,
}: {
  id: string;
  relation: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const { data } = useSWR<Paginated<{ id: number; title: string }>>(`content/${relation}?per_page=100`, fetcher);

  return (
    <select id={id} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className={inputClass}>
      <option value="">— None —</option>
      {data?.data.map((o) => (
        <option key={o.id} value={o.id}>
          {o.title}
        </option>
      ))}
    </select>
  );
}
