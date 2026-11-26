import { TONE_CLASS, type Tone } from "./look";
import m from "../i18n/en/memberships";
import { daysFrom } from "@turftap/ui";

// MEM-06 reminds the customer 3 days before the end; the bar turns amber from then on.
const ENDING_SOON_DAYS = 3;
const BAR_DELAY_MS = 180;
const CARD_STAGGER_MS = 30;
const MAX_STAGGERED = 11;

type BarProps = { startsOn: string; endsOn: string; today: string; index: number };

/** How much of the membership is used, filling in as the card arrives. */
export function MembershipDaysBar({ startsOn, endsOn, today, index }: BarProps) {
  const total = daysFrom(startsOn, endsOn) + 1;
  const left = daysFrom(today, endsOn);
  const waiting = daysFrom(today, startsOn);
  const used = waiting > 0 ? 0 : total - left;
  const tone: Tone = waiting > 0 ? "off" : left <= ENDING_SOON_DAYS ? "watch" : "good";
  const delay = BAR_DELAY_MS + Math.min(index, MAX_STAGGERED) * CARD_STAGGER_MS;
  return (
    <div className={`flex items-center gap-3 ${TONE_CLASS[tone]}`}>
      <div
        role="meter"
        aria-label={m.used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--tt-field)]"
      >
        <span
          className="block h-full origin-left animate-tt-grow rounded-full bg-[var(--tt-tone)]"
          style={{ width: `${(used / total) * 100}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span
        className={`shrink-0 text-xs tabular-nums ${tone === "watch" ? "tt-tone-text font-medium" : "text-muted"}`}
      >
        {waiting > 0 ? m.startsIn(waiting) : m.daysLeft(left)}
      </span>
    </div>
  );
}
