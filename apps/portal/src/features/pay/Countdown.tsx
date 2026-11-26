import { TONE_CLASS } from "../../components/look";
import m from "../../i18n/en/booking";

/** In the last minutes the ring turns red, so a customer still typing hurries. */
const HURRY_MS = 5 * 60_000;
const SIZE = 88;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = { leftMs: number; totalMs: number };

/** PAY-01: the time left to send the receipt, as a ring that empties and the minutes inside it. */
export function Countdown({ leftMs, totalMs }: Props) {
  const share = totalMs > 0 ? Math.min(1, Math.max(0, leftMs / totalMs)) : 0;
  const time = m.pay.timeLeft(leftMs);
  return (
    <div
      role="timer"
      aria-label={m.pay.timeLeftLabel(time)}
      className={`${TONE_CLASS[leftMs <= HURRY_MS ? "bad" : "watch"]} relative grid size-22 shrink-0 animate-tt-pop place-items-center`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-[color-mix(in_oklab,var(--tt-tone)_16%,transparent)]"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
          className="stroke-[var(--tt-tone)] transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
        />
      </svg>
      <span className="tt-tone-text grid justify-items-center gap-0.5 leading-none" aria-hidden>
        {time.split(" ").map((part) => (
          <span key={part} className="text-lg font-bold tracking-tight tabular-nums">
            {part}
          </span>
        ))}
      </span>
    </div>
  );
}
