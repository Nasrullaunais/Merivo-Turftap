import { authProviderContract } from "../../../ports/auth-provider.contract-test";
import { createFakeAuthProvider, fakeTokenFor } from "./fake-auth-provider";

authProviderContract("fake", async () => ({
  provider: createFakeAuthProvider(),
  tokenFor: async (phone) => fakeTokenFor(phone),
}));
