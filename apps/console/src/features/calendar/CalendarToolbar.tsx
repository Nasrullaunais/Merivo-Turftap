import { Button, Label, ListBox, Select } from "@heroui/react";
import type { Resource, Venue } from "@turftap/contract/client";

import m from "../../i18n/en/calendar";
import type { CalendarView } from "./calendarGrid";

type Choice = { id: number; name: string };

function Picker({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <Select className="w-48" value={String(value)} onChange={(id) => onChange(Number(id))}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {choices.map((choice) => (
            <ListBox.Item key={choice.id} id={String(choice.id)} textValue={choice.name}>
              {choice.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

type Props = {
  venues: Venue[];
  venue: Venue;
  onVenueChange: (id: number) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  resources: Resource[];
  resourceId: number | undefined;
  onResourceChange: (id: number) => void;
  onMove: (steps: number) => void;
  onToday: () => void;
};

export function CalendarToolbar(props: Props) {
  const { view } = props;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Picker
        label={m.venueLabel}
        choices={props.venues}
        value={props.venue.id}
        onChange={props.onVenueChange}
      />
      {view === "week" && props.resourceId !== undefined && (
        <Picker
          label={m.resourceLabel}
          choices={props.resources}
          value={props.resourceId}
          onChange={props.onResourceChange}
        />
      )}
      <div role="group" aria-label={m.viewLabel} className="flex gap-1">
        {(["day", "week"] as const).map((choice) => (
          <Button
            key={choice}
            size="sm"
            variant={view === choice ? "primary" : "tertiary"}
            aria-pressed={view === choice}
            onPress={() => props.onViewChange(choice)}
          >
            {m[choice]}
          </Button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="tertiary" onPress={() => props.onMove(-1)}>
          {m.previous[view]}
        </Button>
        <Button size="sm" variant="tertiary" onPress={props.onToday}>
          {m.today}
        </Button>
        <Button size="sm" variant="tertiary" onPress={() => props.onMove(1)}>
          {m.next[view]}
        </Button>
      </div>
    </div>
  );
}
