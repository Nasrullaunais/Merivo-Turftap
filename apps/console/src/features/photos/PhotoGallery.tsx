import { Button, Skeleton } from "@heroui/react";
import { ApiError } from "@turftap/ui";
import type { ChangeEvent } from "react";

import { LoadingButton } from "../../components/LoadingButton";
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
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      {isPending && (
        <div role="status" aria-label={m.loading} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: SKELETON_PHOTOS }, (_, index) => (
            <Skeleton key={index} className="aspect-4/3 w-full rounded-lg" />
          ))}
        </div>
      )}
      {photos?.length === 0 && <p className="text-muted">{m.none}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos?.map((photo, index) => {
          const alt = m.photoAlt(photo.position);
          return (
            <li key={photo.id} className="grid gap-2">
              <img
                src={photo.url}
                alt={alt}
                loading="lazy"
                className="aspect-4/3 w-full rounded-lg bg-default object-cover"
              />
              {photo.position === 1 && <span className="text-sm font-medium">{m.cover}</span>}
              <div className="flex flex-wrap gap-1">
                {canMove && index > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={m.moveEarlierFor(alt)}
                    onPress={() => move(photo.id, photo.position - 1)}
                  >
                    {m.moveEarlier}
                  </Button>
                )}
                {canMove && index < photos.length - 1 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={m.moveLaterFor(alt)}
                    onPress={() => move(photo.id, photo.position + 1)}
                  >
                    {m.moveLater}
                  </Button>
                )}
                {canDelete && (
                  <LoadingButton
                    size="sm"
                    variant="danger-soft"
                    aria-label={m.removeFor(alt)}
                    isPending={deletePhoto.isPending && deletePhoto.variables?.path.id === photo.id}
                    onPress={() => deletePhoto.mutate({ path: { id: photo.id } })}
                  >
                    {m.remove}
                  </LoadingButton>
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
      </ul>
      {canAdd && (
        <label className="grid gap-1 text-sm font-medium">
          {m.addLabel}
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={addPhoto.isPending}
            onChange={pick}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-foreground"
          />
        </label>
      )}
      {unreadable && <p className="text-danger">{m.unreadable}</p>}
    </section>
  );
}
