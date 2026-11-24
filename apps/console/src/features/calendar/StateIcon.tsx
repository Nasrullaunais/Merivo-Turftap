import m from "../../i18n/en/calendar";
import { CALENDAR_STATES, type CalendarState, STATE_COLOURS, STATE_ICONS } from "./calendarStates";

/** `decorative` when the state's name is written next to the icon anyway. */
export function StateIcon({ state, decorative }: { state: CalendarState; decorative?: boolean }) {
  const Icon = STATE_ICONS[state];
  return (
    <Icon
      size={16}
      className="shrink-0"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": m.states[state] })}
    />
  );
}

export function StateLegend() {
  return (
    <ul aria-label={m.legend} className="flex flex-wrap gap-2 text-sm">
      {CALENDAR_STATES.map((state) => (
        <li
          key={state}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${STATE_COLOURS[state]}`}
        >
          <StateIcon state={state} decorative />
          {m.states[state]}
        </li>
      ))}
    </ul>
  );
}
