import { useState } from "react";

import { useCoverPhoto } from "../lib/photos/useCoverPhoto";

type Props = {
  of: { venueId: number } | { resourceId: number };
  alt: string;
  className?: string;
};

/** Shimmers until the photo arrives, then fades it in. Takes no space when there is no photo. */
export function CoverPhoto({ of, alt, className = "aspect-video" }: Props) {
  const { data: cover, isPending } = useCoverPhoto(of);
  const [loaded, setLoaded] = useState(false);
  if (!isPending && !cover) return null;
  return (
    <div className={`tt-cover w-full overflow-hidden ${className}`}>
      {cover && (
        <img
          src={cover.url}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
          className="tt-cover-img size-full object-cover"
        />
      )}
    </div>
  );
}
