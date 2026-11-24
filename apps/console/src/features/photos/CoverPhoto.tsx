import { type PhotoOwner, usePhotos } from "./usePhotos";

/** The first photo filling its box, zooming in a little when its card is hovered. */
export function CoverPhoto({ owner }: { owner: PhotoOwner }) {
  const { data: photos } = usePhotos(owner);
  const cover = photos?.[0];
  if (!cover) return null;
  return (
    <img
      src={cover.url}
      alt=""
      loading="lazy"
      className="absolute inset-0 size-full animate-tt-fade object-cover transition-[scale] duration-500 ease-(--tt-ease) group-hover:scale-105"
    />
  );
}
