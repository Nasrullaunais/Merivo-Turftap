import { useState } from "react";

import { useCoverPhoto } from "../lib/photos/useCoverPhoto";
import type { Offer } from "./sportLook";
import { SportScene } from "./SportScene";

type Props = {
  /** Whose cover photo to show; none means the drawn scenes only. */
  photoOf?: { venueId: number } | { resourceId: number };
  /** Drawn side by side until the photo arrives, and kept when there is no photo. */
  scenes: readonly Offer[];
  alt: string;
};

/**
 * Fills its positioned parent from behind: the cover photo fading in over drawn scenes of what is
 * offered, darkened at the bottom so white text reads. It zooms gently while its `group` is hovered.
 */
export function Backdrop({ photoOf, scenes, alt }: Props) {
  const { data: cover } = useCoverPhoto(photoOf ?? { venueId: 0 }, photoOf !== undefined);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#1d1d1f]">
      <div className="absolute inset-0 flex transition-transform duration-700 ease-[var(--tt-ease)] group-hover:scale-[1.04]">
        {scenes.map((offer) => (
          <SportScene key={offer} offer={offer} className="h-full min-w-0 flex-1" />
        ))}
        {cover && (
          <img
            src={cover.url}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            data-loaded={loaded}
            className="tt-cover-img absolute inset-0 size-full object-cover"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
    </div>
  );
}
