import { Tooltip } from "@heroui/react";
import { localTimeAt, minuteOfDay } from "@turftap/contract";
import type { Booking, Resource } from "@turftap/contract/client";
import { formatMoney, instantInZone } from "@turftap/ui";
import { Phone } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Focusable } from "react-aria-components";

import { TONE_CLASS } from "../../components/look";
import { TYPE_ICONS } from "../../components/resourceLook";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import { type Present, usePresence } from "../../components/usePresence";
import m from "../../i18n/en/calendar";
import { type CalendarView, type Column, type Entry, isOpen, onVenueClock } from "./calendarGrid";
import { type CalendarState, STATE_COLOURS, STATE_ICONS, STATE_TONES } from "./calendarStates";
import { StateIcon } from "./StateIcon";

const ROW_HEIGHT = "2rem";
const MINUTES_PER_HOUR = 60;
/** The heading row and the time column take the first grid line of each direction. */
const FIRST_CELL = 2;
/** An entry this many rows tall has room for the customer's phone number too. */
const ROWS_FOR_PHONE = 3;
const STAGGER_MS = 25;
const MAX_STAGGER = 12;

export type SlotPress = (slot: { resource: Resource; startsAt: string; timeZone: string }) => void;

type Props = {
  view: CalendarView;
  timeZone: string;
  columns: Column[];
  rows: number[];
  entries: Entry[];
  /** Only this state stands out; the others fade back. */
  filter?: CalendarState;
  onSlotPress?: SlotPress;
  onBookingPress?: (booking: Booking) => void;
};

type Now = { date: string; minute: number };

export function CalendarGrid(props: Props) {
  const { view, columns, rows, timeZone } = props;
  const rowCount = Math.max(rows.length, 1);
  const now = useVenueNow(timeZone);
  const shown = usePresence(props.entries, (entry) => entry.key);

  return (
    <div
      data-calendar-scroll
      className="relative min-h-0 flex-1 overflow-auto overscroll-contain tt-panel"
    >
      <div
        className="grid min-w-fit px-3 pb-4"
        style={{
          gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(8.5rem, 1fr))`,
          gridTemplateRows: `auto repeat(${rowCount}, ${ROW_HEIGHT})`,
        }}
      >
        <div
          aria-hidden
          className="sticky top-0 z-50 -ms-3 mb-2 border-b border-[var(--tt-line)] bg-[var(--tt-panel)]"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {columns.map((column, index) => (
          <ColumnHead
            key={`${column.resource.id}-${column.date}`}
            view={view}
            column={column}
            index={index}
            rows={rows}
            entries={props.entries}
            isToday={column.date === now.date}
          />
        ))}
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
        {columns.map((column, index) =>
          isOpen(column) ? (
            <FreeSlots key={index} {...props} column={column} index={index} />
          ) : (
            <div
              key={index}
              className="mx-1 grid animate-tt-fade place-content-center rounded-xl bg-[var(--tt-field)] p-2 text-center text-sm text-muted tt-striped tt-tone-off"
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
        <PastShade columns={columns} rows={rows} now={now} />
        <NowLine columns={columns} rows={rows} now={now} />
        {shown.map((present, order) => (
          <EntryCard key={present.key} present={present} order={order} {...props} />
        ))}
      </div>
    </div>
  );
}

/** A column's name, and a thin bar showing how much of its open time is taken. */
function ColumnHead({
  view,
  column,
  index,
  rows,
  entries,
  isToday,
}: {
  view: CalendarView;
  column: Column;
  index: number;
  rows: number[];
  entries: Entry[];
  isToday: boolean;
}) {
  const share = takenShare(column, index, rows, entries);
  return (
    <div
      className="sticky top-0 z-40 mb-2 grid gap-2 border-b border-[var(--tt-line)] bg-[var(--tt-panel)] px-2 pt-3 pb-2.5"
      style={{ gridColumn: index + FIRST_CELL, gridRow: 1 }}
    >
      {view === "day" ? (
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TopicTile hue="place" icon={TYPE_ICONS[column.resource.type]} size={26} />
          <span className="truncate">{column.resource.name}</span>
        </span>
      ) : (
        <span
          className={`flex items-center gap-1.5 text-sm font-semibold ${isToday ? "text-accent" : ""}`}
        >
          {isToday && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
          <span>{m.dayColumn(column.date)}</span>
        </span>
      )}
      <span aria-hidden className="h-1 overflow-hidden rounded-full bg-[var(--tt-field)]">
        <span
          className="block h-full origin-left rounded-full bg-accent transition-[width] duration-(--tt-dur-3) ease-(--tt-ease)"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
    </div>
  );
}

function takenShare(column: Column, index: number, rows: number[], entries: Entry[]) {
  if (!isOpen(column)) return 0;
  const [opens, closes] = [minuteOfDay(column.hours!.opens), minuteOfDay(column.hours!.closes)];
  const open = rows.filter((minute) => minute >= opens && minute < closes).length;
  const taken = entries
    .filter((entry) => entry.column === index)
    .reduce((sum, entry) => sum + entry.last - entry.first + 1, 0);
  return open === 0 ? 0 : Math.min(taken / open, 1);
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
        className={`flex cursor-pointer items-center px-2 text-start text-xs font-semibold text-transparent outline-none tt-t1 shadow-[inset_1px_0_0_var(--tt-line)] hover:rounded-lg hover:bg-accent-soft hover:text-accent-soft-foreground hover:shadow-[inset_0_0_0_1px_var(--accent)] focus-visible:rounded-lg focus-visible:text-accent-soft-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset ${minute % MINUTES_PER_HOUR === 0 ? "border-t border-[var(--tt-line)]" : "border-t border-dashed border-[var(--tt-line)]"}`}
        style={{ gridColumn: index + FIRST_CELL, gridRow: row + FIRST_CELL }}
        onClick={() =>
          onSlotPress?.({
            resource: column.resource,
            startsAt: instantInZone(column.date, time, timeZone).toISOString(),
            timeZone,
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

function EntryCard({
  present,
  order,
  timeZone,
  filter,
  onBookingPress,
}: Props & { present: Present<Entry>; order: number }) {
  const { item: entry, isNew, isLeaving } = present;
  const { booking } = entry;
  const who = booking?.customerName ?? entry.reason ?? m.states.BLOCKED;
  const isTall = entry.last - entry.first + 1 >= ROWS_FOR_PHONE;
  const isDimmed = filter !== undefined && filter !== entry.state;
  const card = (
    <>
      <span className="flex items-center gap-1 font-semibold tabular-nums">
        <StateIcon state={entry.state} />
        {m.window(entry.startsAt, entry.endsAt, timeZone)}
      </span>
      <span className="truncate font-medium">{who}</span>
      {isTall && booking && (
        <span className="inline-flex items-center gap-1 truncate opacity-80 tabular-nums">
          <Phone aria-hidden size={11} />
          {booking.customerPhone}
        </span>
      )}
      {isNew && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] tt-landed"
        />
      )}
    </>
  );
  const className = `relative z-10 mx-1 my-0.5 flex flex-col gap-px overflow-hidden rounded-lg px-2 py-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-focus animate-tt-card-in ${STATE_COLOURS[entry.state]} ${booking ? "cursor-pointer hover:z-20 hover:-translate-y-px hover:shadow-[var(--tt-shadow-raised)]" : ""} ${isDimmed ? "opacity-25 saturate-0" : ""} ${isLeaving ? "tt-leaving" : ""}`;
  const style: CSSProperties = {
    gridColumn: entry.column + FIRST_CELL,
    gridRow: `${entry.first + FIRST_CELL} / ${entry.last + FIRST_CELL + 1}`,
    animationDelay: `${Math.min(order, MAX_STAGGER) * STAGGER_MS}ms`,
  };

  if (!booking)
    return (
      <div className={className} style={style} inert={isLeaving}>
        {card}
      </div>
    );
  return (
    <Tooltip delay={350} closeDelay={0}>
      <Focusable>
        <button
          type="button"
          className={className}
          style={style}
          inert={isLeaving}
          onClick={() => onBookingPress?.(booking)}
        >
          {card}
        </button>
      </Focusable>
      <Tooltip.Content placement="end top" offset={8} className="max-w-xs p-0">
        <BookingDetails booking={booking} state={entry.state} timeZone={timeZone} />
      </Tooltip.Content>
    </Tooltip>
  );
}

/** What staff want to know at a glance: who, when, how it was booked and what is still owed. */
function BookingDetails({
  booking,
  state,
  timeZone,
}: {
  booking: Booking;
  state: CalendarState;
  timeZone: string;
}) {
  return (
    <div className="grid gap-2.5 p-3 text-sm">
      <div className="grid gap-0.5">
        <span className="font-semibold">{booking.customerName}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums">
          <Phone aria-hidden size={12} />
          {booking.customerPhone}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatePill tone={STATE_TONES[state]} icon={STATE_ICONS[state]} label={m.states[state]} />
        <span className="text-xs text-muted tabular-nums">
          {m.window(booking.startsAt, booking.endsAt, timeZone)} · {m.sources[booking.source]}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 border-t border-[var(--tt-line)] pt-2.5 text-xs">
        {(
          [
            [m.price, booking.price, ""],
            [m.paid, booking.paid, ""],
            [m.balance, booking.balance, booking.balance.amount > 0 ? TONE_CLASS.watch : ""],
          ] as const
        ).map(([label, money, tone]) => (
          <div key={label} className="grid gap-0.5">
            <dt className="text-muted">{label}</dt>
            <dd className={`font-semibold tabular-nums ${tone ? `${tone} tt-tone-text` : ""}`}>
              {formatMoney(money)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const NOW_REFRESH_MS = 60_000;
/** Where the current time sits when the grid opens: a third of the way down, so what's next shows. */
const NOW_FROM_TOP = 1 / 3;

/** The venue's date and minute now, moved on once a minute. */
function useVenueNow(timeZone: string) {
  const [now, setNow] = useState(() => onVenueClock(new Date(), timeZone));
  useEffect(() => {
    const timer = setInterval(() => setNow(onVenueClock(new Date(), timeZone)), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, [timeZone]);
  return now;
}

/** Where now falls among the rows: the row it is in and how far through that row. */
function nowAt(rows: number[], now: Now) {
  const row = rows.findLastIndex((minute) => minute <= now.minute);
  const step = rows[1] !== undefined ? rows[1] - rows[0]! : MINUTES_PER_HOUR;
  if (row < 0 || now.minute >= rows.at(-1)! + step) return undefined;
  return { row, offset: (now.minute - rows[row]!) / step };
}

/** Time already gone is greyed, so the eye goes to what is still ahead. */
function PastShade({ columns, rows, now }: { columns: Column[]; rows: number[]; now: Now }) {
  const at = nowAt(rows, now);
  return columns.map((column, index) => {
    if (!isOpen(column) || column.date > now.date) return null;
    const span =
      column.date < now.date ? rows.length : at ? at.row : now.minute < rows[0]! ? 0 : rows.length;
    if (span <= 0) return null;
    return (
      <div
        key={index}
        aria-hidden
        className="pointer-events-none relative z-[5] bg-[color-mix(in_oklab,var(--tt-canvas)_55%,transparent)]"
        style={{ gridColumn: index + FIRST_CELL, gridRow: `${FIRST_CELL} / span ${span}` }}
      />
    );
  });
}

/** A red line across today's columns at the current time: the one loud thing on the calendar. */
function NowLine({ columns, rows, now }: { columns: Column[]; rows: number[]; now: Now }) {
  const line = useRef<HTMLDivElement>(null);
  const first = columns.findIndex((column) => column.date === now.date);
  const at = nowAt(rows, now);
  const isShown = first >= 0 && at !== undefined;

  useEffect(() => {
    const scroller = line.current?.closest<HTMLElement>("[data-calendar-scroll]");
    if (!scroller || !line.current) return;
    const ahead = line.current.offsetTop - scroller.clientHeight * NOW_FROM_TOP;
    scroller.scrollTo?.({ top: Math.max(ahead, 0), behavior: "smooth" });
    // Once, when the calendar first shows today; later minutes shouldn't move the grid.
  }, [isShown]);

  if (!isShown) return null;
  const span = columns.filter((column) => column.date === now.date).length;
  const top = `calc(${ROW_HEIGHT} * ${at.offset})`;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none relative z-30 h-0 self-start"
        style={{ gridColumn: 1, gridRow: at.row + FIRST_CELL, top }}
      >
        <span className="absolute -top-2.5 end-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white tabular-nums">
          {localTimeAt(now.minute)}
        </span>
      </div>
      <div
        ref={line}
        aria-hidden
        className="pointer-events-none relative z-30 h-0 self-start"
        style={{
          gridColumn: `${first + FIRST_CELL} / span ${span}`,
          gridRow: at.row + FIRST_CELL,
          top,
        }}
      >
        <div className="absolute inset-x-0 -top-px h-0.5 bg-danger" />
        <div className="absolute -start-1.5 -top-[5px] size-3 rounded-full bg-danger ring-2 ring-[var(--tt-panel)]" />
      </div>
    </>
  );
}
