import type { ObjectStorage, StoredFile } from "../../../ports/object-storage";

export function createFakeObjectStorage(): ObjectStorage {
  const files = new Map<string, StoredFile>();
  return {
    save: async (key, file) => void files.set(key, file),
    read: async (key) => files.get(key),
    remove: async (key) => void files.delete(key),
    downloadUrl: async (key, { signedAt, expiresInSeconds }) =>
      `http://fake-storage.local/${key}?signedAt=${signedAt.toISOString()}&expiresIn=${expiresInSeconds}`,
  };
}
