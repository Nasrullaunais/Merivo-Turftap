const MAX_ENTRIES = 10_000;

/** A `ttlSeconds` of 0 turns the cache off. */
export function ttlCache<T>(ttlSeconds: number) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > Date.now()) return hit.value;
      const value = await load();
      if (ttlSeconds > 0) {
        if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
        entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
      return value;
    },
  };
}
