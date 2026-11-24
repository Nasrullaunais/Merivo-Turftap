import type { Venue } from "@turftap/contract/client";
import { CalendarDays, LayoutGrid, MapPin } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "../../components/EmptyState";
import { HUE_COLOUR, TONE_COLOUR } from "../../components/look";
import { type SummaryTile, SummaryTiles } from "../../components/SummaryTiles";
import m from "../../i18n/en/calendar";
import {
  addDays,
  type CalendarView,
  countByState,
  datesShown,
  fullness,
  layOut,
  onVenueClock,
} from "./calendarGrid";
import { type BookingPress, CalendarGrid, type SlotPress } from "./CalendarGrid";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { type CalendarState, STATE_ICONS, STATE_TONES } from "./calendarStates";
import { CalendarToolbar } from "./CalendarToolbar";
import { DateHeader, type DayLoad } from "./DateHeader";
import { useCalendar, useCalendarVenues } from "./useCalendar";
import { useCalendarKeys } from "./useCalendarKeys";

const DAYS_PER_WEEK = 7;
const PERCENT = 100;
const BOOKING_STATES = ["AWAITING_PAYMENT", "AWAITING_CHECK", "CONFIRMED"] as const;

/** How the grid arrives: sliding in from the side it was moved to, or fading in place. */
type Motion = "next" | "previous" | "swap";
const ARRIVAL: Record<Motion, string> = {
  next: "animate-tt-from-next",
  previous: "animate-tt-from-previous",
  swap: "animate-tt-fade",
};

/** T18 and T19 open the walk-in form and the booking details from these. */
type Props = { onSlotPress?: SlotPress; onBookingPress?: BookingPress };

/** BKG-05: a day or week of one venue's bookings, kept fresh by live updates. */
export function BookingCalendar(props: Props) {
  const { data: venues, isPending } = useCalendarVenues();
  const [venueId, setVenueId] = useState<number>();
  const venue = venues?.find((each) => each.id === venueId) ?? venues?.[0];

  if (isPending) return <CalendarSkeleton label={m.loading} withToolbar />;
  if (!venues || !venue)
    return (
      <EmptyState hue="place" icon={MapPin}>
        {m.noVenues}
      </EmptyState>
    );
  return (
    <VenueCalendar
      key={venue.id}
      {...props}
      venues={venues}
      venue={venue}
      onVenueChange={setVenueId}
    />
  );
}

function VenueCalendar({
  venues,
  venue,
  onVenueChange,
  ...handlers
}: Props & { venues: Venue[]; venue: Venue; onVenueChange: (id: number) => void }) {
  const today = () => onVenueClock(new Date(), venue.timeZone).date;
  const [view, setViewNow] = useState<CalendarView>("day");
  const [date, setDate] = useState(today);
  const [resourceId, setResourceIdNow] = useState<number>();
  const [filter, setFilter] = useState<CalendarState>();
  const [motion, setMotion] = useState<Motion>("swap");
  // The whole week loads at once, so moving between its days is instant and the strip can count.
  const week = datesShown("week", date);
  const dates = view === "day" ? [date] : week;
  const { isPending, resources, ...shown } = useCalendar(venue, week);
  const weekResource = resources.find((each) => each.id === resourceId) ?? resources[0];
  const resourcesShown = view === "day" ? resources : resources.filter((r) => r === weekResource);
  const layout = layOut({ venue, dates, resources: resourcesShown, ...shown });

  const go = (next: string, how: Motion) => {
    if (next === date) return;
    setMotion(how);
    setDate(next);
  };
  const move = (steps: number) =>
    go(
      addDays(date, steps * (view === "day" ? 1 : DAYS_PER_WEEK)),
      steps > 0 ? "next" : "previous",
    );
  const toDate = (next: string) => go(next, next > date ? "next" : "previous");
  const setView = (next: CalendarView) => {
    setMotion("swap");
    setViewNow(next);
  };
  const setResourceId = (next: number) => {
    setMotion("swap");
    setResourceIdNow(next);
  };
  useCalendarKeys({ move, today: () => toDate(today()), setView });

  const weekLoad: DayLoad[] = week.map((day) => {
    const ofDay = layOut({ venue, dates: [day], resources, ...shown });
    const { open, taken } = fullness(ofDay);
    const counts = countByState(ofDay.entries);
    return {
      date: day,
      bookings: BOOKING_STATES.reduce((sum, state) => sum + (counts[state] ?? 0), 0),
      share: open === 0 ? 0 : taken / open,
      isClosed: ofDay.columns.every((column) => !column.hours || column.closedDate),
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <CalendarToolbar
        venues={venues}
        venue={venue}
        onVenueChange={onVenueChange}
        view={view}
        onViewChange={setView}
        resources={resources}
        resourceId={weekResource?.id}
        onResourceChange={setResourceId}
      />
      <DateHeader
        view={view}
        date={date}
        dates={dates}
        today={today()}
        timeZone={venue.timeZone}
        week={weekLoad}
        motion={motion}
        onPick={(picked) => {
          toDate(picked);
          if (view === "week" && week.includes(picked)) setView("day");
        }}
        onMove={move}
        onToday={() => toDate(today())}
      />
      <StateTiles isPending={isPending} layout={layout} filter={filter} onFilter={setFilter} />
      {isPending && <CalendarSkeleton label={m.loading} />}
      {!isPending && resources.length === 0 && (
        <EmptyState hue="place" icon={LayoutGrid}>
          {m.noResources}
        </EmptyState>
      )}
      {!isPending && resources.length > 0 && (
        <div
          key={`${view}-${dates[0]}-${weekResource?.id}`}
          className={`flex min-h-96 flex-1 flex-col ${ARRIVAL[motion]}`}
        >
          <CalendarGrid
            view={view}
            timeZone={venue.timeZone}
            filter={filter}
            {...layout}
            {...handlers}
          />
        </div>
      )}
    </div>
  );
}

/** How many bookings are in each state on what is shown; pressing one makes it stand out. */
function StateTiles({
  isPending,
  layout,
  filter,
  onFilter,
}: {
  isPending: boolean;
  layout: ReturnType<typeof layOut>;
  filter: CalendarState | undefined;
  onFilter: (state: CalendarState | undefined) => void;
}) {
  const counts = countByState(layout.entries);
  const { open, taken } = fullness(layout);
  const count = (value: number) => (isPending ? undefined : value);
  const tiles: SummaryTile<CalendarState>[] = [
    {
      show: undefined,
      label: m.allBookings,
      hint: isPending ? undefined : m.booked(open === 0 ? 0 : Math.round((taken / open) * PERCENT)),
      icon: CalendarDays,
      colour: HUE_COLOUR.booking,
      count: count(BOOKING_STATES.reduce((sum, state) => sum + (counts[state] ?? 0), 0)),
    },
    ...BOOKING_STATES.map((state) => ({
      show: state,
      label: m.states[state],
      icon: STATE_ICONS[state],
      colour: TONE_COLOUR[STATE_TONES[state]],
      count: count(counts[state] ?? 0),
    })),
  ];
  return <SummaryTiles label={m.byState} tiles={tiles} show={filter} onShow={onFilter} />;
}
