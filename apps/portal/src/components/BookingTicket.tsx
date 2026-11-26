import type { ResourceType } from "@turftap/contract";
import { onVenueClock } from "@turftap/ui";
import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { CoverPhoto } from "./CoverPhoto";
import common from "../i18n/en/common";
import slots from "../i18n/en/slots";
import { TYPE_ICONS } from "./resourceLook";

const MS_PER_MINUTE = 60_000;
const SEGMENT_STAGGER_MS = 90;

type Props = {
  resource: { id: number; name: string; type: ResourceType; slotMinutes: number };
  venueName: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  /** The customer's name on the stub. */
  holder?: string;
  /** Sits at the right of the stub, such as where the booking stands. */
  stamp?: ReactNode;
};

/** What is booked, drawn as a ticket: the day, start to end with one piece per slot, and whose it is. */
export function BookingTicket({
  resource,
  venueName,
  startsAt,
  endsAt,
  timeZone,
  holder,
  stamp,
}: Props) {
  const Icon = TYPE_ICONS[resource.type];
  const minutes = (Date.parse(endsAt) - Date.parse(startsAt)) / MS_PER_MINUTE;
  const pieces = Math.max(1, Math.round(minutes / resource.slotMinutes));
  const { date } = onVenueClock(startsAt, timeZone);

  return (
    <div className="tt-ticket-shadow">
      <section className="tt-ticket grid [--tt-stub:3.5rem]">
        <CoverPhoto of={{ resourceId: resource.id }} alt={resource.name} className="h-32 sm:h-40" />
        <div className="grid gap-5 p-5 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="tt-tile tt-hue-place size-11 animate-tt-pop rounded-xl">
                <Icon size={22} aria-hidden />
              </span>
              <div className="grid min-w-0">
                <h2 className="truncate text-lg leading-tight font-semibold tracking-tight">
                  {resource.name}
                </h2>
                <p className="flex items-center gap-1 truncate text-sm text-muted">
                  <MapPin size={14} aria-hidden className="shrink-0" />
                  {venueName}
                </p>
              </div>
            </div>
            <DayLeaf date={date} />
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
            <Clock instant={startsAt} timeZone={timeZone} />
            <div className="grid gap-1.5 pb-2">
              <span className="tt-hue-booking justify-self-center rounded-full bg-[color-mix(in_oklab,var(--tt-hue)_12%,var(--tt-panel))] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-[var(--tt-hue)]">
                {common.lengthOf(minutes)}
              </span>
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: pieces }, (_, index) => (
                  <span
                    key={index}
                    className="h-1.5 flex-1 origin-left animate-tt-grow rounded-full bg-accent"
                    style={{ animationDelay: `${200 + index * SEGMENT_STAGGER_MS}ms` }}
                  />
                ))}
              </span>
            </div>
            <Clock instant={endsAt} timeZone={timeZone} end />
          </div>
          <span className="sr-only">{slots.range(startsAt, endsAt, timeZone)}</span>
        </div>

        <div className="mx-4 border-t-2 border-dashed border-[var(--tt-line-strong)]" aria-hidden />
        <div className="flex h-14 items-center justify-between gap-3 px-5">
          {holder ? (
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <span className="tt-hue-people tt-tile size-7 rounded-full text-xs font-semibold">
                {holder.trim().charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{holder}</span>
            </span>
          ) : (
            <span />
          )}
          {stamp}
        </div>
      </section>
    </div>
  );
}

/** A calendar leaf: month on a teal band, the day's number big, the weekday under it. */
function DayLeaf({ date }: { date: string }) {
  return (
    <div className="grid w-14 shrink-0 animate-tt-pop overflow-hidden rounded-xl text-center shadow-[inset_0_0_0_1px_var(--tt-line)] [animation-delay:80ms]">
      <span className="sr-only">{slots.shortDate(date)}</span>
      <span
        aria-hidden
        className="bg-accent py-0.5 text-[11px] font-semibold text-accent-foreground"
      >
        {slots.month(date)}
      </span>
      <span aria-hidden className="pt-1 text-xl leading-none font-bold tabular-nums">
        {slots.dayOfMonth(date)}
      </span>
      <span aria-hidden className="pb-1.5 text-[11px] font-medium text-muted">
        {slots.weekday(date)}
      </span>
    </div>
  );
}

/** "10:00" big with "AM" small beside it, as on a departure board. */
function Clock({
  instant,
  timeZone,
  end = false,
}: {
  instant: string;
  timeZone: string;
  end?: boolean;
}) {
  const [time, half] = slots.clock(instant, timeZone).split("\u00a0");
  return (
    <span aria-hidden className={`flex items-baseline gap-1 ${end ? "justify-self-end" : ""}`}>
      <span className="text-[1.75rem] leading-none font-bold tracking-tight tabular-nums">
        {time}
      </span>
      <span className="text-xs font-semibold text-muted">{half}</span>
    </span>
  );
}
