import { Skeleton } from "@heroui/react";
import { BOOKING_HORIZON_DAYS } from "@turftap/contract";
import type { Resource, Venue } from "@turftap/contract/client";
import { addDays, onVenueClock, weekdayOf } from "@turftap/ui";
import { CalendarOff, CalendarX2, Clock } from "lucide-react";
import { useState } from "react";

import { TONE_CLASS } from "../../components/look";
import m from "../../i18n/en/slots";
import { BookBar } from "./BookBar";
import { DateStrip, type DayState } from "./DateStrip";
import { DayNotice } from "./DayNotice";
import { withViewTransition } from "../../lib/motion/viewTransition";
import { ChosenBlock, type Longer } from "./ChosenBlock";
import { longestCount } from "./lengths";
import { endOf, type Selection } from "./selection";
import { SlotGrid } from "./SlotGrid";
import { useClosedDates } from "./useClosedDates";
import { useSlots } from "./useSlots";

const MS_PER_MINUTE = 60_000;
const SKELETON_SLOTS = 12;

type Props = {
  resource: Resource;
  venue: Venue;
  /** The chosen day, or today on the venue's clock when missing or out of range. */
  date?: string;
  onDateChange: (date: string) => void;
  onBook: (choice: Selection) => void;
};

/** POR-02, BKG-01, BKG-02: pick a day and a start time, grow it with + if wanted, then Book. */
export function SlotPicker({ resource, venue, date: asked, onDateChange, onBook }: Props) {
  const [now] = useState(() => new Date());
  const timeZone = venue.timeZone;
  const today = onVenueClock(now, timeZone).date;
  const dates = Array.from({ length: BOOKING_HORIZON_DAYS + 1 }, (_, i) => addDays(today, i));
  const date = asked && dates.includes(asked) ? asked : today;
  const slotMs = resource.slotMinutes * MS_PER_MINUTE;
  const longest = longestCount(resource);

  const [picked, setPicked] = useState<Selection>();
  const count = picked?.count ?? 1;
  const closed = useClosedDates(venue.id, today, dates.at(-1)!);
  const slots = useSlots(resource.id, date, 1);
  const priced = useSlots(resource.id, date, count, picked !== undefined);
  const canGrow = picked !== undefined && count < longest;
  const longerSlots = useSlots(resource.id, date, count + 1, canGrow);
  // Asked ahead, so after a + the next answer is already here and + never waits.
  useSlots(resource.id, date, count + 2, canGrow && count + 1 < longest);
  const [blockSeen, setBlockSeen] = useState(true);

  const openDays = new Set(venue.openingHours.map((day) => day.weekday));
  const stateOf = (day: string): DayState =>
    closed.data?.has(day) ? "closed" : openDays.has(weekdayOf(day)) ? "open" : "notOpen";

  const [cameFrom, setCameFrom] = useState<"next" | "previous">();
  const changeDate = (day: string) => {
    if (day === date) return;
    setPicked(undefined);
    setCameFrom(day > date ? "next" : "previous");
    onDateChange(day);
  };
  const upcoming = slots.data?.filter((slot) => Date.parse(slot.startsAt) > now.getTime());
  const freeCount = upcoming?.filter((slot) => slot.free).length ?? 0;
  // A start that gets taken while on screen drops out once the new times arrive.
  const choice = upcoming?.some((slot) => slot.free && slot.startsAt === picked?.startsAt)
    ? picked
    : undefined;
  const at = (list: typeof upcoming) => list?.find((slot) => slot.startsAt === choice?.startsAt);
  const total = priced.isPlaceholderData ? undefined : at(priced.data);
  const longer: Longer =
    count >= longest
      ? "longest"
      : longerSlots.isPending || longerSlots.isPlaceholderData
        ? "checking"
        : at(longerSlots.data)?.free
          ? "yes"
          : "notFree";

  const pick = (startsAt: string) =>
    withViewTransition("pick", () => {
      setBlockSeen(true);
      setPicked({ startsAt, count: 1 });
    });
  const setLength = (next: number) =>
    withViewTransition("length", () =>
      setPicked((current) => current && { ...current, count: next }),
    );
  const clear = () => withViewTransition("clear", () => setPicked(undefined));

  const body = () => {
    if (slots.isPending || closed.isPending) {
      return (
        <ul
          role="status"
          aria-label={m.loading}
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
        >
          {Array.from({ length: SKELETON_SLOTS }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-16 rounded-xl" />
            </li>
          ))}
        </ul>
      );
    }
    if (closed.data?.has(date)) {
      return (
        <DayNotice
          tone="bad"
          icon={CalendarX2}
          title={m.closed}
          body={closed.data.get(date) ?? m.closedNoReason}
        />
      );
    }
    if (!slots.data?.length) {
      return (
        <DayNotice tone="off" icon={CalendarOff} title={m.notOpen.title} body={m.notOpen.body} />
      );
    }
    if (!upcoming?.length) {
      return <DayNotice tone="off" icon={Clock} title={m.noneLeft.title} body={m.noneLeft.body} />;
    }
    return (
      <div className="grid gap-4">
        <p className="text-sm text-muted">{m.pickHint}</p>
        <SlotGrid
          slots={upcoming}
          timeZone={timeZone}
          slotMs={slotMs}
          choice={choice}
          onPick={pick}
          block={
            choice && (
              <ChosenBlock
                choice={choice}
                endsAt={endOf(choice, slotMs)}
                timeZone={timeZone}
                slotMinutes={resource.slotMinutes}
                longestMinutes={longest * resource.slotMinutes}
                total={total?.free ? total.price : undefined}
                longer={longer}
                onLength={setLength}
                onClear={clear}
                onBook={() => onBook(choice)}
                onSeen={setBlockSeen}
              />
            )
          }
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 pb-28">
      <section
        aria-label={m.dayTitle}
        className="grid min-w-0 animate-tt-rise grid-cols-1 gap-3 [animation-delay:140ms]"
      >
        <h2 className="text-lg font-semibold tracking-tight">{m.dayTitle}</h2>
        <DateStrip dates={dates} value={date} stateOf={stateOf} onChange={changeDate} />
      </section>

      <section
        aria-label={m.timeTitle}
        className="grid min-w-0 animate-tt-rise grid-cols-1 gap-3 [animation-delay:200ms]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {m.timeTitle}
            <span className="ml-2 text-sm font-normal text-muted">{m.fullDate(date)}</span>
          </h2>
          {upcoming && upcoming.length > 0 && !closed.data?.has(date) && (
            <span className={`${TONE_CLASS[freeCount ? "good" : "watch"]} tt-pill animate-tt-fade`}>
              <span className="tt-dot" aria-hidden />
              {freeCount ? m.freeCount(freeCount) : m.fullyBooked}
            </span>
          )}
        </div>
        <div
          key={date}
          className={
            cameFrom === "next"
              ? "animate-tt-from-next"
              : cameFrom === "previous"
                ? "animate-tt-from-previous"
                : ""
          }
        >
          {body()}
        </div>
      </section>

      <BookBar
        open={choice !== undefined && !blockSeen}
        times={choice ? m.range(choice.startsAt, endOf(choice, slotMs), timeZone) : ""}
        day={m.shortDate(date)}
        price={total?.free ? total.price : undefined}
        onBook={() => choice && onBook(choice)}
        onClear={clear}
      />
    </div>
  );
}
