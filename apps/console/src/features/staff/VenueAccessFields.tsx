import { Checkbox } from "react-aria-components";

import { PILL, TogglePills } from "../../components/Pills";
import m from "../../i18n/en/staff";
import { useVenueChoices } from "./useVenueChoices";
import type { VenueAccess } from "./venueAccess";

/** SIG-06: "All venues", or the tenant's venues to pick from, as pills. */
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
        className={`${PILL} justify-self-start`}
      >
        {m.allVenues}
      </Checkbox>
      {!value.allVenues && (
        <TogglePills
          name="venueIds"
          label={m.venuesLabel}
          value={value.venueIds.map(String)}
          onChange={(ids) => onChange({ allVenues: false, venueIds: ids.map(Number) })}
          required={m.venuesMissing}
          choices={(venues ?? []).map((venue) => ({ value: String(venue.id), label: venue.name }))}
        />
      )}
    </div>
  );
}
