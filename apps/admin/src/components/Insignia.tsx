/** Sri Lanka Air Force roundel used in the admin chrome. */
export function Insignia({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="50" fill="#F7E417" />
      <circle cx="50" cy="50" r="46" fill="#7C1327" />
      <circle cx="50" cy="50" r="24" fill="#B3162E" />
      <circle cx="50" cy="50" r="22" fill="#1E8B3B" />
      <circle cx="50" cy="50" r="17" fill="#2C9C46" />
      <circle cx="50" cy="50" r="12" fill="#F07A1E" />
    </svg>
  );
}
