import { Ban, CircleCheck, Hourglass, type LucideIcon, ScanSearch } from "lucide-react";

import { TONE_CLASS, type Tone } from "../../components/look";
import m from "../../i18n/en/calendar";

export type CalendarState = keyof typeof m.states;

export const CALENDAR_STATES = Object.keys(m.states) as CalendarState[];

/** Tone and icon per state, as console-design.md §3.3 lists them. */
export const STATE_TONES: Record<CalendarState, Tone> = {
  AWAITING_PAYMENT: "watch",
  AWAITING_CHECK: "busy",
  CONFIRMED: "good",
  BLOCKED: "off",
};

export const STATE_ICONS: Record<CalendarState, LucideIcon> = {
  AWAITING_PAYMENT: Hourglass,
  AWAITING_CHECK: ScanSearch,
  CONFIRMED: CircleCheck,
  BLOCKED: Ban,
};

export const STATE_COLOURS: Record<CalendarState, string> = Object.fromEntries(
  CALENDAR_STATES.map((state) => [
    state,
    `tt-block ${TONE_CLASS[STATE_TONES[state]]} ${state === "BLOCKED" ? "tt-striped" : ""}`,
  ]),
) as Record<CalendarState, string>;
