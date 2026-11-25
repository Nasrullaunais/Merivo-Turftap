import { Label, Switch } from "@heroui/react";
import { CircleCheck, Dumbbell } from "lucide-react";

import { Collapse } from "../../components/Collapse";
import { Section } from "../../components/Section";
import m from "../../i18n/en/venues";
import { useChangeVenue } from "./useChangeVenue";
import { useVenue } from "./useVenue";

type Props = { venueId: number; canChange: boolean };
type Change = { hasGym?: boolean; repeatCheckIns?: boolean };

/** VEN-08 and MEM-05: whether the venue has a gym, and how often a membership checks in there. */
export function GymSettings({ venueId, canChange }: Props) {
  const { data: venue } = useVenue(venueId);
  const changeVenue = useChangeVenue(venueId);
  if (!venue) return null;
  const shown = changeVenue.isPending ? { ...venue, ...changeVenue.variables.body } : venue;
  const change = (body: Change) => changeVenue.mutate({ path: { id: venueId }, body });

  return (
    <Section hue="membership" icon={Dumbbell} title={m.gym.title}>
      <div className="grid gap-3 p-4">
        {canChange && (
          <SettingSwitch
            label={m.gym.hasGymLabel}
            isSelected={shown.hasGym}
            isDisabled={changeVenue.isPending}
            onChange={(hasGym) => change({ hasGym })}
          />
        )}
        <p key={String(shown.hasGym)} className="animate-tt-fade text-sm text-muted">
          {shown.hasGym ? m.gym.hasGym : m.gym.noGym}
        </p>
        <Collapse isOpen={shown.hasGym}>
          <div className="grid gap-3 border-t border-[var(--tt-line)] pt-3">
            {canChange && (
              <SettingSwitch
                label={m.gym.repeatLabel}
                isSelected={shown.repeatCheckIns}
                isDisabled={changeVenue.isPending}
                onChange={(repeatCheckIns) => change({ repeatCheckIns })}
              />
            )}
            <p key={String(shown.repeatCheckIns)} className="animate-tt-fade text-sm text-muted">
              {shown.repeatCheckIns ? m.gym.repeats : m.gym.onceADay}
            </p>
          </div>
        </Collapse>
        {changeVenue.isSuccess && (
          <span
            key={changeVenue.submittedAt}
            role="status"
            className="inline-flex animate-tt-pop items-center gap-1 text-sm text-muted"
          >
            <CircleCheck aria-hidden size={15} className="tt-tone-good tt-tone-text" />
            {m.gym.saved}
          </span>
        )}
      </div>
    </Section>
  );
}

type SettingSwitchProps = {
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  onChange: (on: boolean) => void;
};

function SettingSwitch({ label, ...props }: SettingSwitchProps) {
  return (
    <Switch {...props}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label>{label}</Label>
      </Switch.Content>
    </Switch>
  );
}
