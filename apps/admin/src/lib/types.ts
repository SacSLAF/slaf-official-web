export type Locale = "en" | "si" | "ta";

export const LOCALES: { code: Locale; label: string; lang: string }[] = [
  { code: "en", label: "English", lang: "en" },
  { code: "si", label: "සිංහල", lang: "si" },
  { code: "ta", label: "தமிழ்", lang: "ta" },
];

export type Status = "draft" | "in_review" | "rejected" | "published" | "archived";

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "slug" | "select" | "number" | "boolean" | "date" | "datetime" | "image" | "relation";
  translatable?: boolean;
  required?: boolean;
  options?: Record<string, string>;
  max?: number;
  min?: number;
  step?: number;
  help?: string;
  relation?: string;
  list?: boolean;
};

export type ContentTypeDef = {
  type: string;
  label: string;
  singular: string;
  fields: Field[];
  can_create: boolean;
  can_approve: boolean;
};

export type Abilities = Record<"update" | "delete" | "submit" | "approve" | "reject" | "withdraw" | "archive" | "restore", boolean>;

export type UserRef = { id: number; name: string } | null;

export type ContentItem = {
  id: number;
  type: string;
  title: string;
  status: Status;
  created_by: UserRef;
  submitted_by: UserRef;
  submitted_at: string | null;
  reviewed_by: UserRef;
  reviewed_at: string | null;
  review_comment: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  can: Abilities;
  values: Record<string, unknown>;
  image?: MediaItem | null;
  documents?: TenderDocument[];
};

export type MediaItem = { id: number; url: string; width: number; height: number; alt: Record<string, string> | string | null };

export type TenderDocument = {
  id: number;
  title: Record<string, string>;
  file_name: string;
  mime_type: string;
  size: number;
  sha256: string;
  download_count: number;
  created_at: string;
};

export type Me = {
  id: number;
  name: string;
  email: string;
  rank: string | null;
  designation: string | null;
  service_number: string | null;
  must_change_password: boolean;
  roles: string[];
  permissions: string[];
  bases: { id: number; name: string }[];
  recovery_codes_remaining: number;
  last_login_at: string | null;
};

export type Paginated<T> = { data: T[]; meta: { current_page: number; last_page: number; total: number } };
