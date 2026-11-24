import { Button, Calendar, Kbd, Popover, Tooltip } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import {
  CalendarSearch,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import m from "../../i18n/en/calendar";
import type { CalendarView } from "./calendarGrid";

/** One day in the week strip: how full it is, and whether the venue is shut. */
export type DayLoad = { date: string; bookings: number; share: number; isClosed: boolean };

type Props = {
  view: CalendarView;
  date: string;
  dates: string[];
  today: string;
  timeZone: string;
  week: DayLoad[];
  /** Which way the last move went, so the strip slides the same way. */
  motion: string;
  onPick: (date: string) => void;
  onMove: (steps: number) => void;
  onToday: () => void;
};

/** The date as the largest text on the page, a month to jump around in, and this week's days. */
export function DateHeader(props: Props) {
  const { view, dates, today } = props;
  const [isPicking, setPicking] = useState(false);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight tabular-nums">
          <Popover isOpen={isPicking} onOpenChange={setPicking}>
            <Popover.Trigger className="group -ms-2 inline-flex cursor-pointer items-center gap-2 rounded-xl px-2 py-0.5 outline-none tt-t1 hover:bg-[var(--tt-hover)] focus-visible:ring-2 focus-visible:ring-focus">
              <span key={dates[0]} className="animate-tt-fade">
                {m.heading(dates[0]!, dates.at(-1)!)}
              </span>
              <ChevronDown
                aria-hidden
                size={22}
                className={`text-muted transition-transform duration-(--tt-dur-2) ${isPicking ? "rotate-180" : ""}`}
              />
            </Popover.Trigger>
            <Popover.Content placement="bottom start" className="p-0">
              <Popover.Dialog aria-label={m.pickDate} className="p-3">
                <Calendar
                  aria-label={m.pickDate}
                  firstDayOfWeek="mon"
                  value={parseDate(props.date)}
                  onChange={(picked) => {
                    props.onPick(picked.toString());
                    setPicking(false);
                  }}
                >
                  <Calendar.Header>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(day) => <Calendar.Cell date={day} />}</Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </h2>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Globe aria-hidden size={14} />
          {m.timeZone(props.timeZone)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--tt-line)] bg-[var(--tt-panel)] p-1 shadow-[var(--tt-shadow-card)]">
          <StepButton
            label={m.previous[view]}
            shortcut={m.keys.previous}
            icon={ChevronLeft}
            onPress={() => props.onMove(-1)}
          />
          <ul
            key={props.week[0]?.date}
            aria-label={m.weekStrip}
            className={`flex gap-0.5 ${props.motion === "next" ? "animate-tt-from-next" : props.motion === "previous" ? "animate-tt-from-previous" : ""}`}
          >
            {props.week.map((day) => (
              <li key={day.date}>
                <StripDay
                  day={day}
                  isShown={dates.includes(day.date)}
                  isWholeWeek={view === "week"}
                  isToday={day.date === today}
                  onPick={() => props.onPick(day.date)}
                />
              </li>
            ))}
          </ul>
          <StepButton
            label={m.next[view]}
            shortcut={m.keys.next}
            icon={ChevronRight}
            onPress={() => props.onMove(1)}
          />
        </div>
        <Tooltip delay={500}>
          <Button
            variant="secondary"
            isDisabled={dates.includes(today)}
            onPress={props.onToday}
            className="h-[3.75rem] rounded-2xl"
          >
            <CalendarSearch aria-hidden size={16} />
            {m.today}
          </Button>
          <Tooltip.Content placement="bottom">
            <Kbd>{m.keys.today}</Kbd>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}

function StripDay({
  day,
  isShown,
  isWholeWeek,
  isToday,
  onPick,
}: {
  day: DayLoad;
  isShown: boolean;
  /** Every day is shown, so each is tinted rather than filled. */
  isWholeWeek: boolean;
  isToday: boolean;
  onPick: () => void;
}) {
  const isFilled = isShown && !isWholeWeek;
  return (
    <button
      type="button"
      aria-label={m.stripDay(day.date, day.bookings, day.isClosed)}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isShown}
      onClick={onPick}
      className={`relative grid w-9 cursor-pointer sm:w-12 justify-items-center gap-1 rounded-xl pt-1.5 pb-2 outline-none transition-[background-color,color,scale] duration-(--tt-dur-2) ease-(--tt-ease) focus-visible:ring-2 focus-visible:ring-focus active:scale-95 ${isFilled ? "bg-accent text-accent-foreground shadow-sm" : isShown ? "bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft-hover" : "hover:bg-[var(--tt-hover)]"} ${day.isClosed && !isFilled ? "tt-striped tt-tone-off text-muted" : ""}`}
    >
      <span aria-hidden className={`text-xs ${isFilled ? "opacity-85" : "text-muted"}`}>
        {m.weekday(day.date)}
      </span>
      <span
        aria-hidden
        className={`text-base leading-none font-semibold tabular-nums sm:text-lg ${isToday && !isFilled ? "text-accent" : ""}`}
      >
        {m.dayNumber(day.date)}
      </span>
      <span
        aria-hidden
        className={`h-1 w-7 overflow-hidden rounded-full ${isFilled ? "bg-white/30" : "bg-[var(--tt-field)]"}`}
      >
        <span
          className={`block h-full rounded-full transition-[width] duration-(--tt-dur-3) ease-(--tt-ease) ${isFilled ? "bg-white" : "bg-accent"}`}
          style={{ width: `${Math.round(day.share * 100)}%` }}
        />
      </span>
      {isToday && (
        <span
          aria-hidden
          className={`absolute top-1 end-1.5 size-1.5 rounded-full ${isFilled ? "bg-white" : "bg-accent"}`}
        />
      )}
    </button>
  );
}

function StepButton({
  label,
  shortcut,
  icon: Icon,
  onPress,
}: {
  label: string;
  shortcut: string;
  icon: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Tooltip>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={label}
        onPress={onPress}
        className="h-12 w-8 min-w-8 sm:w-10"
      >
        <Icon aria-hidden size={18} />
      </Button>
      <Tooltip.Content placement="bottom" className="flex items-center gap-2">
        {label}
        <Kbd>{shortcut}</Kbd>
      </Tooltip.Content>
    </Tooltip>
  );
}
