import m from "../i18n/en/dates";
import { TONE_CLASS, type Tone } from "./look";

type Props = { date: string; label: string; tone?: Tone };

/** A date as a small tear-off calendar page. `label` is the full date screen readers hear. */
export function DateStub({ date, label, tone }: Props) {
  const page = tone
    ? `${TONE_CLASS[tone]} tt-block`
    : "border border-[var(--tt-line)] bg-[var(--tt-panel)]";
  const small = tone ? "tt-tone-text" : "text-muted";
  return (
    <span
      className={`grid w-12 shrink-0 justify-items-center rounded-lg py-1 leading-none ${page}`}
    >
      <span aria-hidden className={`text-xs ${small}`}>
        {m.weekday(date)}
      </span>
      <span aria-hidden className="py-0.5 text-xl font-semibold tabular-nums">
        {m.day(date)}
      </span>
      <span aria-hidden className={`text-xs ${small}`}>
        {m.month(date)}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
