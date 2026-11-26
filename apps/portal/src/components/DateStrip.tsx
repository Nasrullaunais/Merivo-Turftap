import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

import m from "../i18n/en/slots";

export type DayState = "open" | "closed" | "notOpen";

type Props = {
  dates: string[];
  value: string;
  /** Every day is open when left out. */
  stateOf?: (date: string) => DayState;
  onChange: (date: string) => void;
};

const SCROLL_SHARE = 0.8;

/** One chip per day that can be picked, today first. Closed days keep a red dot so they stand out. */
const alwaysOpen = (): DayState => "open";

export function DateStrip({ dates, value, stateOf = alwaysOpen, onChange }: Props) {
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    strip.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  const scroll = (direction: 1 | -1) =>
    strip.current?.scrollBy({
      left: direction * strip.current.clientWidth * SCROLL_SHARE,
      behavior: "smooth",
    });

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div
        ref={strip}
        className="flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] sm:px-11"
      >
        {dates.map((date, index) => {
          const state = stateOf(date);
          const on = date === value;
          const showMonth = index === 0 || m.dayOfMonth(date) === "1";
          return (
            <button
              key={date}
              type="button"
              aria-pressed={on}
              aria-label={`${index === 0 ? `${m.today}, ` : ""}${m.fullDate(date)}${state === "open" ? "" : `, ${m.closedChip}`}`}
              onClick={() => onChange(date)}
              data-state={state}
              className={`tt-t1 relative grid w-15 shrink-0 snap-start justify-items-center gap-0.5 rounded-2xl border py-2.5 transition-[background-color,color,border-color,scale,box-shadow] active:scale-95 ${
                on
                  ? "border-transparent bg-accent text-accent-foreground shadow-[0_6px_16px_-6px_var(--accent)]"
                  : "border-[var(--tt-line)] bg-[var(--tt-panel)] hover:border-[var(--tt-line-strong)] hover:bg-[var(--tt-hover)]"
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wide ${on ? "" : "text-muted"}`}
              >
                {index === 0 ? m.today : m.weekday(date)}
              </span>
              <span
                className={`text-xl leading-6 font-semibold tabular-nums ${
                  state === "open" || on ? "" : "text-muted line-through decoration-1"
                }`}
              >
                {m.dayOfMonth(date)}
              </span>
              <span className={`text-[11px] ${on ? "" : "text-muted"}`}>
                {showMonth ? m.month(date) : " "}
              </span>
              {state === "closed" && (
                <span
                  aria-hidden
                  className="tt-tone-bad tt-dot absolute top-1.5 right-1.5 ring-2 ring-[var(--tt-panel)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label={m.earlier}
        onClick={() => scroll(-1)}
        className="tt-t1 absolute top-1/2 left-0 hidden size-9 -translate-y-[calc(50%+6px)] place-items-center rounded-full border border-[var(--tt-line)] bg-[var(--tt-panel)] shadow-[var(--tt-shadow-card)] hover:bg-[var(--tt-hover)] active:scale-95 sm:grid"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={m.later}
        onClick={() => scroll(1)}
        className="tt-t1 absolute top-1/2 right-0 hidden size-9 -translate-y-[calc(50%+6px)] place-items-center rounded-full border border-[var(--tt-line)] bg-[var(--tt-panel)] shadow-[var(--tt-shadow-card)] hover:bg-[var(--tt-hover)] active:scale-95 sm:grid"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
