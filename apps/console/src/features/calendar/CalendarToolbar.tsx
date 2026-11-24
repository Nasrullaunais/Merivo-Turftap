import { Button, ListBox, Select, Tooltip } from "@heroui/react";
import type { Resource, Venue } from "@turftap/contract/client";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

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
    <Select
      aria-label={label}
      className="w-52"
      value={String(value)}
      onChange={(id) => onChange(Number(id))}
    >
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
    <div className="flex flex-wrap items-center gap-2">
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
      <div
        role="group"
        aria-label={m.viewLabel}
        className="ms-auto flex rounded-full bg-[var(--tt-field)] p-0.5"
      >
        {(["day", "week"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={view === choice}
            onClick={() => props.onViewChange(choice)}
            className="h-8 cursor-pointer rounded-full px-4 text-sm font-medium text-muted outline-none tt-t1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus aria-pressed:bg-[var(--tt-panel)] aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {m[choice]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <StepButton label={m.previous[view]} icon={ChevronLeft} onPress={() => props.onMove(-1)} />
        <Button size="sm" variant="tertiary" onPress={props.onToday}>
          {m.today}
        </Button>
        <StepButton label={m.next[view]} icon={ChevronRight} onPress={() => props.onMove(1)} />
      </div>
    </div>
  );
}

function StepButton({
  label,
  icon: Icon,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Tooltip>
      <Button isIconOnly size="sm" variant="ghost" aria-label={label} onPress={onPress}>
        <Icon aria-hidden size={18} />
      </Button>
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
  );
}
