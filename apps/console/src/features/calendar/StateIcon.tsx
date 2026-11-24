import m from "../../i18n/en/calendar";
import { type CalendarState, STATE_ICONS } from "./calendarStates";

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
