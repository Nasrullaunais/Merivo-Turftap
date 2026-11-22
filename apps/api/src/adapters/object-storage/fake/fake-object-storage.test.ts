import { objectStorageContract } from "../../../ports/object-storage.contract-test";
import { createFakeObjectStorage } from "./fake-object-storage";

objectStorageContract("fake", async () => createFakeObjectStorage(), { servesUrls: false });
