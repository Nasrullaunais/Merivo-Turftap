import type { Staff } from "@turftap/contract/client";
import { Phone, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Row, Rows } from "../../components/Rows";
import { useFirstIds } from "../../components/useFirstIds";
import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { StaffActions } from "./StaffActions";
import { StaffVenues } from "./StaffVenues";
import { useStaff } from "./useStaff";

type Props = { canManage: boolean; addSlot?: ReactNode };

/** Owners can change each person's role and venues or remove them; everyone else only reads. */
export function StaffList({ canManage, addSlot }: Props) {
  const { data: staff, isPending } = useStaff();

  return (
    <div className="overflow-hidden tt-panel">
      {isPending && (
        <div className="p-3">
          <SkeletonRows label={m.loading} />
        </div>
      )}
      {staff && <StaffRows staff={staff} canManage={canManage} />}
      {addSlot}
    </div>
  );
}

function StaffRows({ staff, canManage }: { staff: Staff[]; canManage: boolean }) {
  const isNew = useFirstIds(staff.map((person) => person.id));
  return (
    <Rows>
      {staff.map((person, index) => (
        <Row
          key={person.id}
          index={index}
          landed={isNew(person.id)}
          lead={<Initials name={person.name} />}
          title={person.name ?? <span className="font-normal text-muted">{m.noName}</span>}
          detail={
            <>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone aria-hidden size={13} />
                {person.phone}
              </span>
              <StaffVenues person={person} canManage={canManage} />
            </>
          }
          end={
            canManage ? (
              <StaffActions person={person} />
            ) : (
              <span className="text-sm text-muted">{tenants.roles[person.role]}</span>
            )
          }
        />
      ))}
    </Rows>
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
      className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold tt-hue-people ${letters ? "bg-[color-mix(in_oklab,var(--tt-hue)_14%,var(--tt-panel))] text-[var(--tt-hue)]" : "border border-dashed border-[var(--tt-line-strong)] bg-[var(--tt-field)]"}`}
    >
      {letters ?? <UserRound size={16} className="text-muted" />}
    </span>
  );
}
