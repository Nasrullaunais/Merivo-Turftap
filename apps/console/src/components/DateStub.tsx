import m from "../i18n/en/dates";

/** A date as a small tear-off calendar page. `label` is the full date screen readers hear. */
export function DateStub({ date, label }: { date: string; label: string }) {
  return (
    <span className="grid w-12 shrink-0 justify-items-center rounded-lg border border-[var(--tt-line)] bg-[var(--tt-panel)] py-1 leading-none">
      <span aria-hidden className="text-xs text-muted">
        {m.weekday(date)}
      </span>
      <span aria-hidden className="py-0.5 text-xl font-semibold tabular-nums">
        {m.day(date)}
      </span>
      <span aria-hidden className="text-xs text-muted">
        {m.month(date)}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
