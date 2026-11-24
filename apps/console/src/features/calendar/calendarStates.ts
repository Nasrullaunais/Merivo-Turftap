import { Ban, type LucideIcon } from "lucide-react";

import { BOOKING_ICONS, BOOKING_TONES } from "../../components/bookingLook";
import { TONE_CLASS, type Tone } from "../../components/look";
import m from "../../i18n/en/calendar";

export type CalendarState = keyof typeof m.states;

export const CALENDAR_STATES = Object.keys(m.states) as CalendarState[];

export const STATE_TONES: Record<CalendarState, Tone> = {
  AWAITING_PAYMENT: BOOKING_TONES.AWAITING_PAYMENT,
  AWAITING_CHECK: BOOKING_TONES.AWAITING_CHECK,
  CONFIRMED: BOOKING_TONES.CONFIRMED,
  BLOCKED: "off",
};

export const STATE_ICONS: Record<CalendarState, LucideIcon> = {
  AWAITING_PAYMENT: BOOKING_ICONS.AWAITING_PAYMENT,
  AWAITING_CHECK: BOOKING_ICONS.AWAITING_CHECK,
  CONFIRMED: BOOKING_ICONS.CONFIRMED,
  BLOCKED: Ban,
};

export const STATE_COLOURS: Record<CalendarState, string> = Object.fromEntries(
  CALENDAR_STATES.map((state) => [
    state,
    `tt-block ${TONE_CLASS[STATE_TONES[state]]} ${state === "BLOCKED" ? "tt-striped" : ""}`,
  ]),
) as Record<CalendarState, string>;
