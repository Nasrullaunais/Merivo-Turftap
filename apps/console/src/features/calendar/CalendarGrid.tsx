import { localTimeAt, minuteOfDay } from "@turftap/contract";
import type { Booking } from "@turftap/contract/client";
import { instantInZone } from "@turftap/ui";

import m from "../../i18n/en/calendar";
import { type CalendarView, type Column, type Entry, isOpen } from "./calendarGrid";
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
  const { view, columns, rows } = props;
  const rowCount = Math.max(rows.length, 1);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-fit gap-x-1"
        style={{
          gridTemplateColumns: `4rem repeat(${columns.length}, minmax(8rem, 1fr))`,
          gridTemplateRows: `auto repeat(${rowCount}, ${ROW_HEIGHT})`,
        }}
      >
        {columns.map((column, index) => (
          <div
            key={`${column.resource.id}-${column.date}`}
            className="border-b border-separator pb-1 text-sm font-semibold"
            style={{ gridColumn: index + FIRST_CELL, gridRow: 1 }}
          >
            {view === "day" ? column.resource.name : m.dayColumn(column.date)}
          </div>
        ))}
        {rows.map(
          (minute, row) =>
            (row === 0 || minute % MINUTES_PER_HOUR === 0) && (
              <div
                key={minute}
                className="-translate-y-2 text-xs text-muted"
                style={{ gridColumn: 1, gridRow: row + FIRST_CELL }}
              >
                {localTimeAt(minute)}
              </div>
            ),
        )}
        {columns.map((column, index) =>
          isOpen(column) ? (
            <FreeSlots key={index} {...props} column={column} index={index} />
          ) : (
            <div
              key={index}
              className="grid place-content-center rounded bg-surface-secondary p-2 text-center text-sm text-muted"
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
        className="border-t border-separator hover:bg-surface-secondary"
        style={{ gridColumn: index + FIRST_CELL, gridRow: row + FIRST_CELL }}
        onClick={() =>
          onSlotPress?.({
            resourceId: column.resource.id,
            startsAt: instantInZone(column.date, time, timeZone).toISOString(),
          })
        }
      />
    );
  });
}

function EntryCard({ entry, timeZone, onBookingPress }: Props & { entry: Entry }) {
  const { booking } = entry;
  const who = booking?.customerName ?? entry.reason ?? m.states.BLOCKED;
  const card = (
    <>
      <span className="flex items-center gap-1 font-semibold">
        <StateIcon state={entry.state} />
        {m.window(entry.startsAt, entry.endsAt, timeZone)}
      </span>
      <span className="truncate">{who}</span>
    </>
  );
  const className = `z-10 flex flex-col overflow-hidden rounded-md px-1.5 text-left text-xs ${STATE_COLOURS[entry.state]}`;
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
