import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPhoto, createUploadedFile } from "@turftap/contract/client";
import {
  deletePhotoMutation,
  listPhotosQueryKey,
  updatePhotoMutation,
} from "@turftap/contract/client/react-query";

import { shrinkPhoto } from "./shrinkPhoto";
import type { PhotoOwner } from "./usePhotos";

function useReloadList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: listPhotosQueryKey() });
}

/** VEN-06: shrinks the picked photo, uploads it, then adds it after the owner's other photos. */
export function useAddPhoto(owner: PhotoOwner) {
  return useMutation({
    mutationFn: async (picked: File) => {
      const file = await shrinkPhoto(picked);
      const { data: uploaded } = await createUploadedFile({ body: { file, purpose: "PHOTO" } });
      const { data: photo } = await createPhoto({ body: { fileId: uploaded.data.id, ...owner } });
      return photo;
    },
    onSuccess: useReloadList(),
  });
}

export function useMovePhoto() {
  return useMutation({ ...updatePhotoMutation(), onSuccess: useReloadList() });
}

export function useDeletePhoto() {
  return useMutation({ ...deletePhotoMutation(), onSuccess: useReloadList() });
}
