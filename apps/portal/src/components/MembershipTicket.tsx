import { daysFrom } from "@turftap/ui";
import { BadgeCheck, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import m from "../i18n/en/memberships";
import slots from "../i18n/en/slots";
import { DayLeaf } from "./BookingTicket";

type Props = {
  planName: string;
  venueName: string;
  /** The first and last day it can be used, both included. */
  startsOn: string;
  endsOn: string;
  holder?: string;
  stamp?: ReactNode;
};

/** MEM-02: a membership drawn like a booking's ticket: first day to last day, and whose it is. */
export function MembershipTicket({ planName, venueName, startsOn, endsOn, holder, stamp }: Props) {
  return (
    <div className="tt-ticket-shadow">
      <section className="tt-ticket tt-hue-membership grid [--tt-stub:3.5rem]">
        <div className="grid gap-5 bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_oklab,var(--tt-hue)_14%,transparent),transparent_70%)] p-5 pb-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tt-tile size-11 animate-tt-pop rounded-xl">
              <BadgeCheck size={22} aria-hidden />
            </span>
            <div className="grid min-w-0">
              <h2 className="truncate text-lg leading-tight font-semibold tracking-tight">
                {planName}
              </h2>
              <p className="flex items-center gap-1 truncate text-sm text-muted">
                <MapPin size={14} aria-hidden className="shrink-0" />
                {venueName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
            <Labelled label={m.ticket.from}>
              <DayLeaf key={startsOn} date={startsOn} />
            </Labelled>
            <div className="grid gap-1.5 pb-7">
              <span
                key={`${startsOn}-${endsOn}`}
                className="animate-tt-pop justify-self-center rounded-full bg-[color-mix(in_oklab,var(--tt-hue)_14%,var(--tt-panel))] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-[var(--tt-hue)]"
              >
                {m.days(daysFrom(startsOn, endsOn) + 1)}
              </span>
              <span
                aria-hidden
                className="block h-1.5 origin-left animate-tt-grow rounded-full bg-[var(--tt-hue)] [animation-delay:200ms]"
              />
            </div>
            <Labelled label={m.ticket.to} end>
              <DayLeaf key={endsOn} date={endsOn} />
            </Labelled>
          </div>
          <span className="sr-only">
            {m.ticket.range(slots.shortDate(startsOn), slots.shortDate(endsOn))}
          </span>
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

function Labelled({
  label,
  end = false,
  children,
}: {
  label: string;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${end ? "justify-items-end" : ""}`}>
      {children}
      <span aria-hidden className="text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
