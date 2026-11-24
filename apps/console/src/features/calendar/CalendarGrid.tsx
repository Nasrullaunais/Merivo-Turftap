import { localTimeAt, minuteOfDay } from "@turftap/contract";
import type { Booking } from "@turftap/contract/client";
import { instantInZone } from "@turftap/ui";
import { useEffect, useState } from "react";

import m from "../../i18n/en/calendar";
import { type CalendarView, type Column, type Entry, isOpen, onVenueClock } from "./calendarGrid";
import { STATE_COLOURS } from "./calendarStates";
import { StateIcon } from "./StateIcon";

const ROW_HEIGHT = "1.75rem";
const MINUTES_PER_HOUR = 60;
/** The heading row and the time column take the first grid line of each direction. */
const FIRST_CELL = 2;

export type SlotPress = (slot: { resourceId: number; startsAt: string }) => void;

type Props = {
  view: CalendarView;
  timeZone: string;
  columns: Column[];
  rows: number[];
  entries: Entry[];
  onSlotPress?: SlotPress;
  onBookingPress?: (booking: Booking) => void;
};

export function CalendarGrid(props: Props) {
  const { view, columns, rows, timeZone } = props;
  const rowCount = Math.max(rows.length, 1);
  const now = useVenueNow(timeZone);

  return (
    <div className="overflow-x-auto tt-panel">
      <div
        className="grid min-w-fit px-3 pb-4"
        style={{
          gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(8rem, 1fr))`,
          gridTemplateRows: `auto repeat(${rowCount}, ${ROW_HEIGHT})`,
        }}
      >
        {columns.map((column, index) => {
          const isToday = column.date === now.date;
          return (
            <div
              key={`${column.resource.id}-${column.date}`}
              className={`mb-2 border-b border-[var(--tt-line)] px-2 py-3 text-sm font-semibold ${isToday && view === "week" ? "text-accent" : ""}`}
              style={{ gridColumn: index + FIRST_CELL, gridRow: 1 }}
            >
              {view === "day" ? column.resource.name : m.dayColumn(column.date)}
            </div>
          );
        })}
        {rows.map(
          (minute, row) =>
            (row === 0 || minute % MINUTES_PER_HOUR === 0) && (
              <div
                key={minute}
                className="-translate-y-2 text-xs text-muted tabular-nums"
                style={{ gridColumn: 1, gridRow: row + FIRST_CELL }}
              >
                {localTimeAt(minute)}
              </div>
            ),
        )}
        <NowLine columns={columns} rows={rows} now={now} />
        {columns.map((column, index) =>
          isOpen(column) ? (
            <FreeSlots key={index} {...props} column={column} index={index} />
          ) : (
            <div
              key={index}
              className="grid place-content-center rounded-lg bg-[var(--tt-field)] p-2 text-center text-sm text-muted tt-striped tt-tone-off"
              style={{
                gridColumn: index + FIRST_CELL,
                gridRow: `${FIRST_CELL} / span ${rowCount}`,
              }}
            >
              <span className="font-semibold">{m.closed}</span>
              {column.closedDate?.reason && <span>{column.closedDate.reason}</span>}
            </div>
          ),
        )}
        {props.entries.map((entry) => (
          <EntryCard key={entry.key} entry={entry} {...props} />
        ))}
      </div>
    </div>
  );
}

function FreeSlots({
  column,
  index,
  rows,
  entries,
  timeZone,
  onSlotPress,
}: Props & { column: Column; index: number }) {
  const [opens, closes] = [minuteOfDay(column.hours!.opens), minuteOfDay(column.hours!.closes)];
  const taken = new Set(
    entries
      .filter((entry) => entry.column === index)
      .flatMap((entry) => rows.slice(entry.first, entry.last + 1)),
  );
  const where = `${column.resource.name}, ${m.dayColumn(column.date)}`;

  return rows.map((minute, row) => {
    if (minute < opens || minute >= closes || taken.has(minute)) return null;
    const time = localTimeAt(minute);
    return (
      <button
        key={minute}
        type="button"
        aria-label={m.freeSlot(where, time)}
        className={`group/slot flex cursor-pointer items-center px-1.5 text-start text-xs font-medium text-transparent outline-none tt-t1 hover:bg-accent-soft hover:text-accent-soft-foreground focus-visible:text-accent-soft-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset shadow-[inset_1px_0_0_var(--tt-line)] ${minute % MINUTES_PER_HOUR === 0 ? "border-t border-[var(--tt-line)]" : "border-t border-dashed border-[var(--tt-line)]"}`}
        style={{ gridColumn: index + FIRST_CELL, gridRow: row + FIRST_CELL }}
        onClick={() =>
          onSlotPress?.({
            resourceId: column.resource.id,
            startsAt: instantInZone(column.date, time, timeZone).toISOString(),
          })
        }
      >
        <span aria-hidden className="tabular-nums">
          {m.freeSlotHint(time)}
        </span>
      </button>
    );
  });
}

function EntryCard({ entry, timeZone, onBookingPress }: Props & { entry: Entry }) {
  const { booking } = entry;
  const who = booking?.customerName ?? entry.reason ?? m.states.BLOCKED;
  const card = (
    <>
      <span className="flex items-center gap-1 font-semibold tabular-nums">
        <StateIcon state={entry.state} />
        {m.window(entry.startsAt, entry.endsAt, timeZone)}
      </span>
      <span className="truncate">{who}</span>
    </>
  );
  const className = `z-10 mx-1 my-px flex flex-col overflow-hidden rounded-md px-2 py-0.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-focus ${STATE_COLOURS[entry.state]} ${booking ? "cursor-pointer" : ""}`;
  const style = {
    gridColumn: entry.column + FIRST_CELL,
    gridRow: `${entry.first + FIRST_CELL} / ${entry.last + FIRST_CELL + 1}`,
  };

  return booking ? (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => onBookingPress?.(booking)}
    >
      {card}
    </button>
  ) : (
    <div className={className} style={style}>
      {card}
    </div>
  );
}

const NOW_REFRESH_MS = 60_000;

/** The venue's date and minute now, moved on once a minute. */
function useVenueNow(timeZone: string) {
  const [now, setNow] = useState(() => onVenueClock(new Date(), timeZone));
  useEffect(() => {
    const timer = setInterval(() => setNow(onVenueClock(new Date(), timeZone)), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, [timeZone]);
  return now;
}

/** A red line across today's columns at the current time: the one loud thing on the calendar. */
function NowLine({
  columns,
  rows,
  now,
}: {
  columns: Column[];
  rows: number[];
  now: { date: string; minute: number };
}) {
  const first = columns.findIndex((column) => column.date === now.date);
  const row = rows.findLastIndex((minute) => minute <= now.minute);
  const step = rows[1] !== undefined ? rows[1] - rows[0]! : MINUTES_PER_HOUR;
  if (first < 0 || row < 0 || now.minute >= rows.at(-1)! + step) return null;
  const span = columns.filter((column) => column.date === now.date).length;
  const offset = (now.minute - rows[row]!) / step;

  return (
    <div
      aria-hidden
      className="pointer-events-none relative z-30 h-0 self-start"
      style={{
        gridColumn: `${first + FIRST_CELL} / span ${span}`,
        gridRow: row + FIRST_CELL,
        top: `calc(${ROW_HEIGHT} * ${offset})`,
      }}
    >
      <div className="absolute inset-x-0 -top-px h-0.5 bg-danger" />
      <div className="absolute -start-1.5 -top-[5px] size-3 rounded-full bg-danger ring-2 ring-[var(--tt-panel)]" />
    </div>
  );
}
