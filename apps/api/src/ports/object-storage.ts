export type StoredFile = { body: Uint8Array; contentType: string };

/** Saves and reads files by key. Keys start with the tenant id: `<tenantId>/receipts/<uuid>.jpg`. */
export interface ObjectStorage {
  save(key: string, file: StoredFile): Promise<void>;
  read(key: string): Promise<StoredFile | undefined>;
  remove(key: string): Promise<void>;
  /** A link anyone can open until it expires. */
  downloadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
