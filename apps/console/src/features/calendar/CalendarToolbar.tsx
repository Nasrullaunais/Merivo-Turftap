import { Kbd, ListBox, Select, Tooltip } from "@heroui/react";
import type { Resource, Venue } from "@turftap/contract/client";
import { MapPin } from "lucide-react";
import { Focusable } from "react-aria-components";

import { TYPE_ICONS } from "../../components/resourceLook";
import m from "../../i18n/en/calendar";
import type { CalendarView } from "./calendarGrid";

type Props = {
  venues: Venue[];
  venue: Venue;
  onVenueChange: (id: number) => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  resources: Resource[];
  resourceId: number | undefined;
  onResourceChange: (id: number) => void;
};

const VIEWS = ["day", "week"] as const;

export function CalendarToolbar(props: Props) {
  const { view } = props;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label={m.venueLabel}
        className="w-60"
        value={String(props.venue.id)}
        onChange={(id) => props.onVenueChange(Number(id))}
      >
        <Select.Trigger className="gap-2 tt-hue-place">
          <MapPin aria-hidden size={16} className="shrink-0 text-[var(--tt-hue)]" />
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {props.venues.map((venue) => (
              <ListBox.Item key={venue.id} id={String(venue.id)} textValue={venue.name}>
                {venue.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {view === "week" && props.resourceId !== undefined && (
        <ResourceChips {...props} resourceId={props.resourceId} />
      )}
      <div
        role="group"
        aria-label={m.viewLabel}
        className="relative ms-auto grid grid-cols-2 rounded-full bg-[var(--tt-field)] p-0.5"
      >
        <span
          aria-hidden
          className={`absolute inset-y-0.5 start-0.5 w-[calc(50%-2px)] rounded-full bg-[var(--tt-panel)] shadow-sm transition-transform duration-(--tt-dur-3) ease-(--tt-ease) ${view === "week" ? "translate-x-full" : ""}`}
        />
        {VIEWS.map((choice) => (
          <Tooltip key={choice} delay={500}>
            <Focusable>
              <button
                type="button"
                aria-pressed={view === choice}
                onClick={() => props.onViewChange(choice)}
                className="relative h-8 min-w-20 cursor-pointer rounded-full px-4 text-sm font-medium text-muted outline-none tt-t1 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus aria-pressed:text-foreground"
              >
                {m[choice]}
              </button>
            </Focusable>
            <Tooltip.Content placement="bottom">
              <Kbd>{m.keys[choice]}</Kbd>
            </Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

/** The week view shows one resource; its chips pick which, each with its type's icon. */
function ResourceChips({
  resources,
  resourceId,
  onResourceChange,
}: Props & { resourceId: number }) {
  return (
    <div
      role="radiogroup"
      aria-label={m.resourceLabel}
      className="flex animate-tt-rise flex-wrap gap-1.5"
    >
      {resources.map((resource) => {
        const Icon = TYPE_ICONS[resource.type];
        const isOn = resource.id === resourceId;
        return (
          <button
            key={resource.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => onResourceChange(resource.id)}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium outline-none tt-t1 focus-visible:ring-2 focus-visible:ring-focus ${isOn ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-[var(--tt-line)] bg-[var(--tt-panel)] text-muted hover:bg-[var(--tt-hover)] hover:text-foreground"}`}
          >
            <Icon aria-hidden size={15} />
            {resource.name}
          </button>
        );
      })}
    </div>
  );
}
