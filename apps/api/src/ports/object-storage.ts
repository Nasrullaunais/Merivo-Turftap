export type StoredFile = { body: Uint8Array; contentType: string };

/** When a download link was signed and how long it works. */
export type LinkTiming = { signedAt: Date; expiresInSeconds: number };

/** Saves and reads files by key. Keys start with the tenant id: `<tenantId>/receipts/<uuid>.jpg`. */
export interface ObjectStorage {
  save(key: string, file: StoredFile): Promise<void>;
  read(key: string): Promise<StoredFile | undefined>;
  remove(key: string): Promise<void>;
  /** A link anyone can open until it expires. The same key and timing give the same link. */
  downloadUrl(key: string, timing: LinkTiming): Promise<string>;
}
