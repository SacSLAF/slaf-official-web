"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cx } from "./ui";

/**
 * Minimal structural editor. Output is sanitised again server-side,
 * so the toolbar only offers what the public site's allow-list keeps.
 */
export function RichText({
  value,
  onChange,
  disabled,
  lang,
  id,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  lang: string;
  id?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, protocols: ["https", "mailto", "tel"], HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-editor", lang, ...(id ? { id } : {}), "aria-multiline": "true", role: "textbox" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            h2: editor.isActive("heading", { level: 2 }),
            h3: editor.isActive("heading", { level: 3 }),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
          }
        : null,
  });

  if (!editor) return <div className="h-64 rounded-md border border-line bg-surface" />;

  const tools: [string, string, boolean | undefined, () => void][] = [
    ["B", "Bold", state?.bold, () => editor.chain().focus().toggleBold().run()],
    ["I", "Italic", state?.italic, () => editor.chain().focus().toggleItalic().run()],
    ["H2", "Heading", state?.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ["H3", "Subheading", state?.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run()],
    ["• List", "Bulleted list", state?.bullet, () => editor.chain().focus().toggleBulletList().run()],
    ["1. List", "Numbered list", state?.ordered, () => editor.chain().focus().toggleOrderedList().run()],
    ["❝", "Quote", state?.quote, () => editor.chain().focus().toggleBlockquote().run()],
    [
      "Link",
      "Link",
      state?.link,
      () => {
        if (editor.isActive("link")) return editor.chain().focus().unsetLink().run();
        const url = window.prompt("Link URL (https://…)");
        if (url && /^(https:|mailto:|tel:)/.test(url)) editor.chain().focus().setLink({ href: url }).run();
      },
    ],
  ];

  return (
    <div className={cx("overflow-hidden rounded-md border border-line bg-surface", disabled && "opacity-70")}>
      {!disabled && (
        <div className="flex flex-wrap gap-1 border-b border-line bg-surface-muted px-2 py-1.5" role="toolbar" aria-label="Formatting">
          {tools.map(([label, title, active, run]) => (
            <button
              key={title}
              type="button"
              title={title}
              aria-pressed={!!active}
              onClick={run}
              className={cx(
                "rounded px-2 py-1 text-xs font-semibold",
                active ? "bg-navy-800 text-white" : "text-ink-muted hover:bg-surface hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
