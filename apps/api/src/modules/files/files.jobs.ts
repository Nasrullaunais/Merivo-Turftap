import { defineJob } from "../../lib/jobs";
import { ports } from "../../ports";

type RemoveData = { key: string };

/** Queued with the deletion of the file's row, so the bytes only go once that is saved. */
export const removeStoredFile = ({ key }: RemoveData) => ports().storage.remove(key);

export const removeStoredFileJob = defineJob<RemoveData>("remove-stored-file", removeStoredFile);
