import { Label, SearchField } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { checkInRefusal, PhoneInput } from "@turftap/contract";
import type { CheckIn, Customer, Membership, Venue } from "@turftap/contract/client";
import { BadgeCheck, DoorOpen, MapPin, Phone, SearchX, Users, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { IconAction } from "../../components/IconAction";
import { sweepIndex } from "../../components/look";
import { ChoicePills } from "../../components/Pills";
import { SkeletonRows } from "../../components/SkeletonRows";
import { SmoothHeight } from "../../components/SmoothHeight";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/checkIns";
import { MembershipCheckIn } from "./MembershipCheckIn";
import { useCustomerMemberships, useCustomerSearch } from "./useCheckIns";

export type Picked = Pick<Customer, "id" | "name" | "phone">;

type Props = {
  venues: Venue[];
  venue: Venue;
  onVenue: (venueId: number) => void;
  today: string;
  todaysCheckIns: CheckIn[] | undefined;
  typed: string;
  onType: (typed: string) => void;
  picked: Picked | undefined;
  onPick: (customer: Picked | undefined) => void;
  can: { checkIn: boolean; takeCash: boolean; sell: boolean };
};

/** MEM-05: find the customer by phone, then check them in on one of their memberships. */
export function CheckInDesk(props: Props) {
  const { venues, venue, onVenue, typed, onType, picked, onPick } = props;
  const search = useRef<HTMLInputElement>(null);
  const isActive = picked !== undefined || typed.trim() !== "";

  const startOver = () => {
    onPick(undefined);
    onType("");
    search.current?.focus();
  };

  return (
    <section aria-label={m.title} className="overflow-hidden tt-panel">
      <div className="flex flex-wrap items-end gap-4 p-5">
        <TopicTile
          hue="membership"
          icon={DoorOpen}
          size={48}
          on={picked !== undefined}
          className="animate-tt-pop rounded-xl"
        />
        <SearchField value={typed} onChange={onType} autoFocus className="min-w-60 flex-1">
          <Label>{m.searchLabel}</Label>
          <SearchField.Group className="h-12">
            <SearchField.SearchIcon />
            <SearchField.Input
              ref={search}
              inputMode="tel"
              autoComplete="off"
              placeholder="077 123 4567"
              className="text-lg tabular-nums"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {venues.length > 1 && (
          <ChoicePills
            name="venueId"
            label={m.venueLabel}
            value={String(venue.id)}
            onChange={(value) => onVenue(Number(value))}
            choices={venues.map((each) => ({
              value: String(each.id),
              label: each.name,
              icon: MapPin,
            }))}
          />
        )}
      </div>
      <SmoothHeight>
        {isActive && (
          <div className="border-t border-[var(--tt-line)] bg-[var(--tt-canvas)] p-5">
            {picked ? (
              <CustomerAtDesk
                key={`${picked.id}-${venue.id}`}
                {...props}
                picked={picked}
                onClear={startOver}
                onCheckedIn={() => search.current?.select()}
              />
            ) : (
              <Matches typed={typed} onPick={onPick} canSell={props.can.sell} />
            )}
          </div>
        )}
      </SmoothHeight>
    </section>
  );
}

function Matches({
  typed,
  onPick,
  canSell,
}: {
  typed: string;
  onPick: (customer: Picked) => void;
  canSell: boolean;
}) {
  const { customers, isSearching } = useCustomerSearch(typed);
  const phone = PhoneInput.safeParse(typed);
  const exact = phone.success ? customers?.find((each) => each.phone === phone.data) : undefined;

  // A whole phone number that belongs to one customer opens them straight away.
  useEffect(() => {
    if (exact) onPick(exact);
  }, [exact, onPick]);

  if (!customers) return isSearching ? <SkeletonRows label={m.searching} rows={2} /> : null;
  if (customers.length === 0)
    return (
      <div className="grid animate-tt-rise justify-items-center gap-3 py-6 text-center">
        <TopicTile hue="people" icon={SearchX} size={44} className="rounded-xl" />
        <p className="text-muted">{m.noCustomer}</p>
        {canSell && <SellLink />}
      </div>
    );
  return (
    <ul aria-label={m.matches} className="grid gap-2 tt-sweep sm:grid-cols-2">
      {customers.map((customer, index) => (
        <li key={customer.id} style={sweepIndex(index)}>
          <button
            type="button"
            onClick={() => onPick(customer)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--tt-line)] bg-[var(--tt-panel)] p-3 text-start outline-none transition-[translate,box-shadow,border-color] duration-(--tt-dur-2) ease-(--tt-ease) hover:-translate-y-0.5 hover:border-[var(--tt-line-strong)] hover:shadow-[var(--tt-shadow-raised)] focus-visible:ring-2 focus-visible:ring-focus active:scale-[0.99]"
          >
            <TopicTile hue="people" icon={Users} size={36} />
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate font-medium">{customer.name}</span>
              <span className="text-sm text-muted tabular-nums">{customer.phone}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const SellLink = () => (
  <Link to="/memberships" className="font-medium text-accent hover:underline">
    {m.sell}
  </Link>
);

type CustomerProps = Props & {
  picked: Picked;
  onClear: () => void;
  onCheckedIn: () => void;
};

/** Usable ones first, then ones with something to fix, then ones that can't be used. */
const ORDER = {
  usable: 0,
  BALANCE_OWED: 1,
  NOT_PAID: 2,
  NOT_STARTED: 3,
  ENDED: 4,
  CANCELLED: 5,
};

function CustomerAtDesk({
  picked,
  venue,
  today,
  todaysCheckIns,
  can,
  onClear,
  onCheckedIn,
}: CustomerProps) {
  const { data: memberships } = useCustomerMemberships(picked.id, venue.id);
  const rank = (membership: Membership) => ORDER[checkInRefusal(membership, today) ?? "usable"];
  const isOver = (membership: Membership) => rank(membership) >= ORDER.ENDED;
  const current = memberships?.filter((each) => each.status !== "EXPIRED" && !isOver(each)) ?? [];
  // With nothing current, the latest finished one says why they can't come in.
  const latestOver = memberships
    ?.filter((each) => each.status !== "EXPIRED" && isOver(each))
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn))
    .at(0);
  const shown = (current.length > 0 || !latestOver ? current : [latestOver]).sort(
    (a, b) => rank(a) - rank(b) || a.endsOn.localeCompare(b.endsOn),
  );
  const lastInOf = (membershipId: number) =>
    todaysCheckIns?.find((checkIn) => checkIn.membershipId === membershipId);

  return (
    <div className="grid gap-4">
      <div className="flex animate-tt-rise items-center gap-3">
        <TopicTile hue="people" icon={Users} size={40} className="rounded-xl" />
        <div className="grid min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">{picked.name}</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
            <Phone aria-hidden size={13} />
            {picked.phone}
          </span>
        </div>
        <IconAction icon={X} label={m.clear} hint={m.clear} onPress={onClear} />
      </div>
      {!memberships ? (
        <SkeletonRows label={m.loadingMemberships} rows={1} />
      ) : shown.length === 0 ? (
        <div className="grid animate-tt-rise justify-items-center gap-3 py-4 text-center">
          <TopicTile hue="membership" icon={BadgeCheck} size={44} className="rounded-xl" />
          <p className="text-muted">{m.noMembership}</p>
          {can.sell && <SellLink />}
        </div>
      ) : (
        <ul aria-label={m.memberships(picked.name)} className="grid gap-3">
          {shown.map((membership, index) => (
            <li key={membership.id}>
              <MembershipCheckIn
                membership={membership}
                venue={venue}
                today={today}
                lastIn={lastInOf(membership.id)}
                canCheckIn={can.checkIn}
                canTakeCash={can.takeCash}
                index={index}
                onCheckedIn={onCheckedIn}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
