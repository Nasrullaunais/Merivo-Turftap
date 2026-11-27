import type { Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { Dumbbell } from "lucide-react";

import { OfferLink } from "../../components/OfferLink";
import { OpenPill } from "../../components/OpenPill";
import { PictureCard, STRETCHED_LINK } from "../../components/PictureCard";
import m from "../../i18n/en/memberships";
import sports from "../../i18n/en/sports";
import { usePlans } from "./usePlans";

/** MEM-02: the gym's card on its venue's page, leading to the gym's own page with its plans. */
export function GymCard({ venue }: { venue: Venue }) {
  const { data: plans } = usePlans(venue.id, venue.hasGym);
  if (!venue.hasGym || plans?.length === 0) return null;
  const cheapest = plans?.toSorted((a, b) => a.price.amount - b.price.amount)[0];
  return (
    <section aria-labelledby="gym-title" className="grid gap-4">
      <h2
        id="gym-title"
        className="animate-tt-rise text-xl font-semibold tracking-tight [animation-delay:200ms]"
      >
        {sports.gymTitle}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="animate-tt-card-in [animation-delay:260ms]">
          <PictureCard
            scenes={["GYM"]}
            alt=""
            hue="membership"
            badge={<OpenPill venue={venue} />}
            icon={<Dumbbell size={22} aria-hidden />}
            className="aspect-[4/3]"
            title={
              <OfferLink
                venueId={venue.id}
                offer="GYM"
                resourceIds={[]}
                gymOnly={false}
                className={STRETCHED_LINK}
              >
                {sports.names.GYM}
              </OfferLink>
            }
          >
            <p className="flex h-5 items-center gap-1.5 truncate text-sm text-white/80">
              {cheapest && (
                <span className="animate-tt-fade font-semibold text-white tabular-nums">
                  {m.plans.from(formatMoney(cheapest.price))}
                </span>
              )}
              {plans && <span className="animate-tt-fade">· {m.plans.count(plans.length)}</span>}
            </p>
          </PictureCard>
        </li>
      </ul>
    </section>
  );
}
