import { httpErrors } from "../../../lib/errors";
import type { AuthProvider } from "../../../ports/auth-provider";

const PREFIX = "fake:";

/** Accepts `fake:+94771234567` as a token for that phone. For tests and local development only. */
export const fakeTokenFor = (phone: string) => `${PREFIX}${phone}`;

export function createFakeAuthProvider(): AuthProvider {
  return {
    async verify(token) {
      if (!token.startsWith(PREFIX)) throw httpErrors.invalidToken();
      return { phone: token.slice(PREFIX.length) };
    },
  };
}
