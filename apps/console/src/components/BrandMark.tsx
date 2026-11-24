/** A teal pitch with a centre line: the TurfTap mark until a real logo exists. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" width={size} height={size} className="shrink-0">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect
        x="7"
        y="9"
        width="18"
        height="14"
        rx="2.5"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
      <path d="M16 9v14" stroke="white" strokeWidth="2" />
      <circle cx="16" cy="16" r="2.6" fill="none" stroke="white" strokeWidth="1.8" />
    </svg>
  );
}
