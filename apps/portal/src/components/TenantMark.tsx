const MAX_INITIALS = 2;

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((word) => word[0]!.toUpperCase())
    .join("");

/** The tenant's initials on a teal square, until tenants can upload a logo. */
export function TenantMark({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 animate-tt-pop place-items-center rounded-[10px] bg-accent text-sm font-semibold tracking-wide text-accent-foreground shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]"
    >
      {initialsOf(name)}
    </span>
  );
}
