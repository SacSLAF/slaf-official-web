/** Sri Lanka Air Force roundel: yellow ring, maroon field, red ring, green ring, orange centre. */
export function Roundel({ className = "size-10", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <circle cx="50" cy="50" r="50" fill="#F7E417" />
      <circle cx="50" cy="50" r="46" fill="#7C1327" />
      <circle cx="50" cy="50" r="24" fill="#B3162E" />
      <circle cx="50" cy="50" r="22" fill="#1E8B3B" />
      <circle cx="50" cy="50" r="17" fill="#2C9C46" />
      <circle cx="50" cy="50" r="12" fill="#F07A1E" />
    </svg>
  );
}
