import { Skeleton } from "@heroui/react";
import { ApiError } from "@turftap/ui";
import { ArrowLeft, ArrowRight, ImagePlus, Images, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";

import { IconAction } from "../../components/IconAction";
import { sweepIndex } from "../../components/look";
import { Section } from "../../components/Section";
import m from "../../i18n/en/photos";
import { useAddPhoto, useDeletePhoto, useMovePhoto } from "./useChangePhotos";
import { type PhotoOwner, usePhotos } from "./usePhotos";

const SKELETON_PHOTOS = 3;

type Props = { owner: PhotoOwner; canAdd: boolean; canMove: boolean; canDelete: boolean };

export function PhotoGallery({ owner, canAdd, canMove, canDelete }: Props) {
  const { data: photos, isPending } = usePhotos(owner);
  const addPhoto = useAddPhoto(owner);
  const movePhoto = useMovePhoto();
  const deletePhoto = useDeletePhoto();
  const move = (id: number, position: number) =>
    movePhoto.mutate({ path: { id }, body: { position } });
  // ApiErrors are already shown as a toast; anything else means the browser couldn't open the file.
  const unreadable = addPhoto.error && !(addPhoto.error instanceof ApiError);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) addPhoto.mutate(file);
  };

  return (
    <Section hue="place" icon={Images} title={m.title} count={photos?.length}>
      <div className="grid gap-3 p-4">
        {isPending && (
          <div
            role="status"
            aria-label={m.loading}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {Array.from({ length: SKELETON_PHOTOS }, (_, index) => (
              <Skeleton key={index} className="aspect-4/3 w-full rounded-lg" />
            ))}
          </div>
        )}
        {photos?.length === 0 && !canAdd && <p className="text-muted">{m.none}</p>}
        {photos && (
          <ul className="grid grid-cols-2 gap-3 tt-sweep sm:grid-cols-3">
            {photos.map((photo, index) => {
              const alt = m.photoAlt(photo.position);
              return (
                <li
                  key={photo.id}
                  style={sweepIndex(index)}
                  className="group relative overflow-hidden rounded-lg"
                >
                  <img
                    src={photo.url}
                    alt={alt}
                    loading="lazy"
                    className="aspect-4/3 w-full bg-[var(--tt-field)] object-cover"
                  />
                  {photo.position === 1 && (
                    <span className="absolute start-2 top-2 rounded-md bg-[var(--tt-panel)] px-2 py-0.5 text-xs font-medium shadow-sm">
                      {m.cover}
                    </span>
                  )}
                  <div className="absolute end-2 bottom-2 flex gap-0.5 rounded-lg bg-[var(--tt-panel)] p-0.5 opacity-0 shadow-sm tt-t1 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    {canMove && index > 0 && (
                      <IconAction
                        icon={ArrowLeft}
                        label={m.moveEarlierFor(alt)}
                        hint={m.moveEarlier}
                        onPress={() => move(photo.id, photo.position - 1)}
                      />
                    )}
                    {canMove && index < photos.length - 1 && (
                      <IconAction
                        icon={ArrowRight}
                        label={m.moveLaterFor(alt)}
                        hint={m.moveLater}
                        onPress={() => move(photo.id, photo.position + 1)}
                      />
                    )}
                    {canDelete && (
                      <IconAction
                        danger
                        icon={Trash2}
                        label={m.removeFor(alt)}
                        hint={m.remove}
                        isPending={
                          deletePhoto.isPending && deletePhoto.variables?.path.id === photo.id
                        }
                        onPress={() => deletePhoto.mutate({ path: { id: photo.id } })}
                      />
                    )}
                  </div>
                </li>
              );
            })}
            {addPhoto.isPending && (
              <li role="status" aria-label={m.adding} className="animate-tt-pop">
                <Skeleton className="aspect-4/3 w-full rounded-lg" />
              </li>
            )}
            {canAdd && !addPhoto.isPending && (
              <li>
                <label className="grid aspect-4/3 cursor-pointer place-content-center justify-items-center gap-1 rounded-lg border border-dashed border-[var(--tt-line-strong)] text-accent tt-t1 hover:bg-[var(--tt-hover)] has-focus-visible:ring-2 has-focus-visible:ring-focus">
                  <ImagePlus aria-hidden size={22} />
                  <span aria-hidden className="text-sm font-medium">
                    {photos.length === 0 ? m.addFirst : m.add}
                  </span>
                  <span aria-hidden className="text-xs text-muted">
                    {m.fileKinds}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-label={m.addLabel}
                    onChange={pick}
                    className="sr-only"
                  />
                </label>
              </li>
            )}
          </ul>
        )}
        {unreadable && <p className="text-danger">{m.unreadable}</p>}
      </div>
    </Section>
  );
}
