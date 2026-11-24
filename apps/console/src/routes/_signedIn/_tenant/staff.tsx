import { Button, Label, SearchField } from "@heroui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { STAFF_ROLES, type StaffRole } from "@turftap/contract";
import { Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { FormModal } from "../../../components/FormModal";
import { HUE_COLOUR } from "../../../components/look";
import { SkeletonCards } from "../../../components/SkeletonRows";
import { SummaryTiles } from "../../../components/SummaryTiles";
import { canOpen } from "../../../config/routePermissions";
import { AddStaffForm } from "../../../features/staff/AddStaffForm";
import { ROLE_ICONS } from "../../../features/staff/roleLook";
import { CARD_MIN, StaffCards } from "../../../features/staff/StaffCards";
import { useStaff } from "../../../features/staff/useStaff";
import m from "../../../i18n/en/staff";
import { PageLayout } from "../../../layout/PageLayout";
import { can } from "../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/staff")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/staff")) throw redirect({ to: "/" });
  },
  component: StaffPage,
});

const matches = (search: string) => (person: { name: string | null; phone: string }) => {
  const words = search.trim().toLowerCase();
  if (!words) return true;
  const digits = words.replace(/\D/g, "");
  return (
    (person.name?.toLowerCase().includes(words) ?? false) ||
    (digits.length > 0 && person.phone.replace(/\D/g, "").includes(digits.replace(/^0/, "")))
  );
};

function StaffPage() {
  const { tenant } = Route.useRouteContext();
  const canAdd = can(tenant, "staff:create");
  const { data: staff, isPending } = useStaff();
  const [role, setRole] = useState<StaffRole>();
  const [search, setSearch] = useState("");
  const [isAdding, setAdding] = useState(false);
  const all = staff ?? [];
  const shown = all.filter((person) => !role || person.role === role).filter(matches(search));
  const countOf = (which?: StaffRole) =>
    staff && all.filter((person) => !which || person.role === which).length;

  return (
    <PageLayout
      title={m.title}
      actions={
        canAdd && (
          <Button onPress={() => setAdding(true)}>
            <Plus aria-hidden size={16} />
            {m.addTitle}
          </Button>
        )
      }
    >
      <SummaryTiles
        label={m.byRole}
        show={role}
        onShow={setRole}
        tiles={[
          {
            show: undefined,
            label: m.everyone,
            icon: Users,
            colour: HUE_COLOUR.people,
            count: countOf(),
          },
          ...STAFF_ROLES.map((each) => ({
            show: each,
            label: m.rolePlural[each],
            icon: ROLE_ICONS[each],
            colour: HUE_COLOUR.people,
            count: countOf(each),
          })),
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchField aria-label={m.search} value={search} onChange={setSearch} className="w-72">
          <Label className="sr-only">{m.search}</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={m.search} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {staff && (
          <span aria-live="polite" className="text-sm text-muted tabular-nums">
            {m.count(shown.length, all.length)}
          </span>
        )}
      </div>
      {isPending ? (
        <SkeletonCards label={m.loading} min={CARD_MIN} cards={4} />
      ) : (
        <StaffCards
          staff={shown}
          canManage={can(tenant, "staff:update")}
          isFiltered={shown.length < all.length}
        />
      )}
      {canAdd && (
        <FormModal
          isOpen={isAdding}
          onOpenChange={setAdding}
          hue="people"
          icon={UserPlus}
          title={m.addTitle}
        >
          <AddStaffForm />
        </FormModal>
      )}
    </PageLayout>
  );
}
