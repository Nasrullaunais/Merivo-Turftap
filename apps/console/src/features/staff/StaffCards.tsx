import type { Staff } from "@turftap/contract/client";
import type { StaffRole } from "@turftap/contract";
import { Phone, SearchX, UserRound, Users } from "lucide-react";

import { CardCell, CardGrid } from "../../components/CardGrid";
import { EmptyState } from "../../components/EmptyState";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { ROLE_ICONS } from "./roleLook";
import { RemoveStaff, StaffRoleSelect } from "./StaffActions";
import { StaffVenues } from "./StaffVenues";

export const CARD_MIN = "19rem";

type Props = { staff: Staff[]; canManage: boolean; isFiltered: boolean };

/** Owners can change each person's role and venues or remove them; everyone else only reads. */
export function StaffCards({ staff, canManage, isFiltered }: Props) {
  const shown = usePresence(staff, (person) => person.id);
  if (shown.length === 0)
    return (
      <EmptyState hue="people" icon={isFiltered ? SearchX : Users}>
        {isFiltered ? m.noMatches : m.none}
      </EmptyState>
    );
  return (
    <CardGrid label={m.title} min={CARD_MIN}>
      {shown.map((present, index) => (
        <CardCell key={present.key} present={present} index={index}>
          <StaffCard person={present.item} canManage={canManage} />
        </CardCell>
      ))}
    </CardGrid>
  );
}

function StaffCard({ person, canManage }: { person: Staff; canManage: boolean }) {
  const RoleIcon = ROLE_ICONS[person.role];
  return (
    <article className="flex w-full flex-col gap-4 tt-card p-4">
      <div className="flex items-start gap-3">
        <Initials name={person.name} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-semibold">
            {person.name ?? <span className="font-normal text-muted">{m.noName}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
            <Phone aria-hidden size={13} />
            {person.phone}
          </span>
        </div>
        {canManage && <RemoveStaff person={person} />}
      </div>
      <div className="mt-auto grid gap-2.5 border-t border-[var(--tt-line)] pt-3">
        {canManage ? (
          <StaffRoleSelect person={person} />
        ) : (
          <RoleChip role={person.role} icon={RoleIcon} />
        )}
        <StaffVenues person={person} canManage={canManage} />
      </div>
    </article>
  );
}

function RoleChip({ role, icon: Icon }: { role: StaffRole; icon: (typeof ROLE_ICONS)[StaffRole] }) {
  return (
    <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full bg-[var(--tt-field)] px-2.5 py-1 text-sm font-medium tt-hue-people">
      <Icon aria-hidden size={14} className="text-[var(--tt-hue)]" />
      {tenants.roles[role]}
    </span>
  );
}

/** A person's initials on the people hue; someone who hasn't signed in yet shows a dashed ring. */
function Initials({ name }: { name: string | null }) {
  const letters = name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold tt-hue-people ${letters ? "bg-[color-mix(in_oklab,var(--tt-hue)_14%,var(--tt-panel))] text-[var(--tt-hue)]" : "border border-dashed border-[var(--tt-line-strong)] bg-[var(--tt-field)]"}`}
    >
      {letters ?? <UserRound size={18} className="text-muted" />}
    </span>
  );
}
