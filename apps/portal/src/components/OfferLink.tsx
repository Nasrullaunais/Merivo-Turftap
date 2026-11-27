import { Link } from "@tanstack/react-router";

import { SPORT_SLUGS, type Offer } from "./sportLook";

type Props = {
  venueId: number;
  offer: Offer;
  /** The venue's resources of this sport; one of them skips the sport's page. */
  resourceIds: readonly number[];
  /** A venue with only a gym shows its plans on its own page. */
  gymOnly: boolean;
  className?: string;
  "aria-label"?: string;
  "data-on"?: boolean;
  children?: React.ReactNode;
};

/** Opens what a customer picked at a venue: the gym, a sport, or the one resource of that sport. */
export function OfferLink({ venueId, offer, resourceIds, gymOnly, ...link }: Props) {
  if (offer === "GYM") {
    return gymOnly ? (
      <Link to="/venues/$venueId" params={{ venueId }} {...link} />
    ) : (
      <Link to="/venues/$venueId/gym" params={{ venueId }} {...link} />
    );
  }
  const [only, ...others] = resourceIds;
  if (only !== undefined && others.length === 0) {
    return <Link to="/resources/$resourceId" params={{ resourceId: only }} {...link} />;
  }
  return (
    <Link
      to="/venues/$venueId/sports/$sport"
      params={{ venueId, sport: SPORT_SLUGS[offer] }}
      {...link}
    />
  );
}
