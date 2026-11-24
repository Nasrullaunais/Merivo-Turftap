import { SkeletonLine } from "../../components/SkeletonRows";
import m from "../../i18n/en/venues";
import { useVenue } from "./useVenue";

export function VenueName({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);
  return venue ? venue.name : <SkeletonLine label={m.loadingOne} className="h-7 w-56" />;
}

export function VenueAddress({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);
  return venue ? (
    <p className="-mt-4 text-muted">{venue.address}</p>
  ) : (
    <SkeletonLine label={m.loadingOne} className="h-4 w-72" />
  );
}
