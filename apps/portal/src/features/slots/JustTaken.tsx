import { CalendarX2 } from "lucide-react";

import m from "../../i18n/en/booking";

/** BKG-02: back on the time list because the chosen time went to someone else first. */
export function JustTaken() {
  return (
    <div
      role="alert"
      className="tt-tone-bad tt-panel flex animate-tt-nudge items-center gap-3 p-4 [animation-delay:200ms]"
    >
      <span className="tt-status-badge !size-11 shrink-0 !rounded-xl">
        <CalendarX2 size={20} aria-hidden />
      </span>
      <div className="grid gap-0.5">
        <h2 className="font-semibold tracking-tight">{m.justTaken.title}</h2>
        <p className="text-sm text-pretty text-muted">{m.justTaken.body}</p>
      </div>
    </div>
  );
}
