import { describe, expect, it } from "bun:test";

import { Unauthorized } from "../lib/errors";
import type { AuthProvider } from "./auth-provider";

export type AuthProviderSetup = {
  provider: AuthProvider;
  tokenFor: (phone: string) => Promise<string>;
};

export function authProviderContract(name: string, setup: () => Promise<AuthProviderSetup>) {
  describe(`AuthProvider: ${name}`, () => {
    it("verify_returnsThePhoneOfAValidToken", async () => {
      const { provider, tokenFor } = await setup();
      expect(await provider.verify(await tokenFor("+94771234567"))).toEqual({
        phone: "+94771234567",
      });
    });

    it("verify_refusesAGarbledToken", async () => {
      const { provider } = await setup();
      await expect(provider.verify("not-a-token")).rejects.toBeInstanceOf(Unauthorized);
    });
  });
}
