import { Checkbox, CheckboxGroup, FieldError, Label } from "@heroui/react";

import m from "../../i18n/en/staff";
import { useVenueChoices } from "./useVenueChoices";
import type { VenueAccess } from "./venueAccess";

/** SIG-06: "All venues", or a list of the tenant's venues to pick from. */
export function VenueAccessFields({
  value,
  onChange,
}: {
  value: VenueAccess;
  onChange: (value: VenueAccess) => void;
}) {
  const { data: venues } = useVenueChoices();

  return (
    <div className="grid gap-3">
      <Checkbox
        isSelected={value.allVenues}
        onChange={(allVenues) => onChange({ allVenues, venueIds: [] })}
      >
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>{m.allVenues}</Label>
        </Checkbox.Content>
      </Checkbox>
      {!value.allVenues && (
        <CheckboxGroup
          name="venueIds"
          isRequired
          value={value.venueIds.map(String)}
          onChange={(ids) => onChange({ allVenues: false, venueIds: ids.map(Number) })}
          validate={(ids) => (ids.length > 0 ? null : m.venuesMissing)}
        >
          <Label>{m.venuesLabel}</Label>
          <div className="flex flex-wrap gap-4">
            {venues?.map((venue) => (
              <Checkbox key={venue.id} value={String(venue.id)}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label>{venue.name}</Label>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </div>
          <FieldError />
        </CheckboxGroup>
      )}
    </div>
  );
}
