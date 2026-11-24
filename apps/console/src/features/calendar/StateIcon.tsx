import m from "../../i18n/en/calendar";
import { CALENDAR_STATES, type CalendarState, STATE_COLOURS } from "./calendarStates";

const SHAPES: Record<CalendarState, React.ReactNode> = {
  AWAITING_PAYMENT: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  AWAITING_CHECK: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  CONFIRMED: <path d="M5 12.5l4.5 4.5L19 7" />,
  BLOCKED: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
};

/** `decorative` when the state's name is written next to the icon anyway. */
export function StateIcon({ state, decorative }: { state: CalendarState; decorative?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": m.states[state] })}
    >
      {SHAPES[state]}
    </svg>
  );
}

export function StateLegend() {
  return (
    <ul aria-label={m.legend} className="flex flex-wrap gap-2 text-sm">
      {CALENDAR_STATES.map((state) => (
        <li
          key={state}
          className={`flex items-center gap-1 rounded border-l-4 px-2 py-1 ${STATE_COLOURS[state]}`}
        >
          <StateIcon state={state} decorative />
          {m.states[state]}
        </li>
      ))}
    </ul>
  );
}
