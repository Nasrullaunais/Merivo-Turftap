import m from "../../i18n/en/calendar";

export type CalendarState = keyof typeof m.states;

export const CALENDAR_STATES = Object.keys(m.states) as CalendarState[];

/** Each state also has its own icon, so it can be told apart without seeing colour. */
export const STATE_COLOURS: Record<CalendarState, string> = {
  AWAITING_PAYMENT: "bg-warning-soft text-warning-soft-foreground border-warning",
  AWAITING_CHECK: "bg-accent-soft text-accent-soft-foreground border-accent",
  CONFIRMED: "bg-success-soft text-success-soft-foreground border-success",
  BLOCKED: "bg-default-soft text-default-soft-foreground border-default",
};
