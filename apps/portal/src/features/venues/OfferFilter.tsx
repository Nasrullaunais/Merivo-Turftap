import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";

import { OFFER_HUES, OFFER_ICONS, offerSlug, type Offer } from "../../components/sportLook";
import sports from "../../i18n/en/sports";

const CHIP =
  "tt-t1 group inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--tt-panel)] pr-4 pl-1.5 text-sm font-medium ring-1 ring-[var(--tt-line)] hover:ring-[var(--tt-line-strong)] hover:shadow-[var(--tt-shadow-card)] active:scale-[0.97] aria-[current=true]:bg-foreground aria-[current=true]:text-background aria-[current=true]:ring-foreground";
const TILE =
  "tt-tile size-8 rounded-full transition-transform duration-200 group-hover:scale-110 group-aria-[current=true]:bg-white/15 group-aria-[current=true]:text-white";

/** Narrows the venues to one sport or the gym. The choice is in the address, so Back keeps it. */
export function OfferFilter({ offers, chosen }: { offers: Offer[]; chosen?: Offer }) {
  return (
    <nav
      aria-label={sports.filterLabel}
      className="-mx-4 flex animate-tt-rise gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [animation-delay:120ms]"
    >
      <Link to="/" search={{}} replace aria-current={chosen === undefined} className={CHIP}>
        <span className={`${TILE} tt-hue-plain`}>
          <LayoutGrid size={16} aria-hidden />
        </span>
        {sports.everything}
      </Link>
      {offers.map((offer) => {
        const Icon = OFFER_ICONS[offer];
        return (
          <Link
            key={offer}
            to="/"
            search={{ offer: offerSlug(offer) }}
            replace
            aria-current={offer === chosen}
            className={CHIP}
          >
            <span className={`${TILE} ${OFFER_HUES[offer]}`}>
              <Icon size={16} aria-hidden />
            </span>
            {sports.names[offer]}
          </Link>
        );
      })}
    </nav>
  );
}
