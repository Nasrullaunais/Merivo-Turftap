import { MapPin, Phone } from "lucide-react";

import { RecordHeader } from "../../components/RecordHeader";
import { SkeletonLine } from "../../components/SkeletonRows";
import m from "../../i18n/en/venues";
import { useVenue } from "./useVenue";

/** The venue page's header card; a skeleton holds its place while the venue loads. */
export function VenueHeader({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);
  return (
    <RecordHeader
      hue="place"
      icon={MapPin}
      name={venue ? venue.name : <SkeletonLine label={m.loadingOne} className="h-7 w-56" />}
      details={
        venue ? (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{venue.address}</span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Phone aria-hidden size={14} />
              {venue.phone}
            </span>
          </span>
        ) : (
          <SkeletonLine label={m.loadingOne} className="h-4 w-72" />
        )
      }
    />
  );
}
