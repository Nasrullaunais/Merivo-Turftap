import { useEffect, useRef } from "react";

import type { CalendarView } from "./calendarGrid";

type Actions = {
  move: (steps: number) => void;
  today: () => void;
  setView: (view: CalendarView) => void;
};

/** Fields, lists and dialogs keep their own keys; the calendar only listens when none has focus. */
const BUSY_PLACES =
  "input, textarea, select, [contenteditable], [role=listbox], [role=grid], [role=dialog], [role=menu]";

/** ← and → move, T goes to today, D and W switch the view. */
export function useCalendarKeys(actions: Actions) {
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest(BUSY_PLACES)) return;
      const act = {
        ArrowLeft: () => latest.current.move(-1),
        ArrowRight: () => latest.current.move(1),
        t: latest.current.today,
        d: () => latest.current.setView("day"),
        w: () => latest.current.setView("week"),
      }[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!act) return;
      event.preventDefault();
      act();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
