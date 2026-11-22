import { describe, expect, it } from "bun:test";

import type { ObjectStorage } from "./object-storage";

export function objectStorageContract(
  name: string,
  setup: () => Promise<ObjectStorage>,
  { servesUrls }: { servesUrls: boolean },
) {
  describe(`ObjectStorage: ${name}`, () => {
    const file = { body: new TextEncoder().encode("hello"), contentType: "text/plain" };

    it("read_returnsWhatWasSaved", async () => {
      const storage = await setup();
      const key = `test/${crypto.randomUUID()}.txt`;
      await storage.save(key, file);
      const read = await storage.read(key);
      expect(read?.contentType).toBe("text/plain");
      expect(new TextDecoder().decode(read?.body)).toBe("hello");
    });

    it("read_returnsUndefinedForAMissingKey", async () => {
      const storage = await setup();
      expect(await storage.read(`test/${crypto.randomUUID()}`)).toBeUndefined();
    });

    it("remove_deletesTheFile", async () => {
      const storage = await setup();
      const key = `test/${crypto.randomUUID()}.txt`;
      await storage.save(key, file);
      await storage.remove(key);
      expect(await storage.read(key)).toBeUndefined();
    });

    it("downloadUrl_servesTheFile", async () => {
      const storage = await setup();
      const key = `test/${crypto.randomUUID()}.txt`;
      await storage.save(key, file);
      const url = await storage.downloadUrl(key, 60);
      expect(url).toContain(key);
      if (servesUrls) expect(await (await fetch(url)).text()).toBe("hello");
    });
  });
}
