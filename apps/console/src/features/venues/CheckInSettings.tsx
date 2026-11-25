import { Label, Switch } from "@heroui/react";
import { CircleCheck, DoorOpen } from "lucide-react";

import { Section } from "../../components/Section";
import checkIns from "../../i18n/en/checkIns";
import { useChangeVenue } from "./useChangeVenue";
import { useVenue } from "./useVenue";

const m = checkIns.settings;

type Props = { venueId: number; canChange: boolean };

/** MEM-05: whether a membership can be checked in more than once a day at this venue. */
export function CheckInSettings({ venueId, canChange }: Props) {
  const { data: venue } = useVenue(venueId);
  const changeVenue = useChangeVenue(venueId);
  if (!venue) return null;
  const repeats = changeVenue.isPending
    ? (changeVenue.variables.body?.repeatCheckIns ?? venue.repeatCheckIns)
    : venue.repeatCheckIns;
  return (
    <Section hue="membership" icon={DoorOpen} title={m.title}>
      <div className="grid gap-2 p-4">
        {canChange ? (
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              isSelected={repeats}
              isDisabled={changeVenue.isPending}
              onChange={(repeatCheckIns) =>
                changeVenue.mutate({ path: { id: venueId }, body: { repeatCheckIns } })
              }
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>{m.repeatLabel}</Label>
              </Switch.Content>
            </Switch>
            {changeVenue.isSuccess && (
              <span
                key={changeVenue.submittedAt}
                role="status"
                className="inline-flex animate-tt-pop items-center gap-1 text-sm text-muted"
              >
                <CircleCheck aria-hidden size={15} className="tt-tone-good tt-tone-text" />
                {m.saved}
              </span>
            )}
          </div>
        ) : null}
        <p key={String(repeats)} className="animate-tt-fade text-sm text-muted">
          {repeats ? m.repeats : m.onceADay}
        </p>
      </div>
    </Section>
  );
}
