import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

import { httpErrors } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import type { AuthProvider } from "../../../ports/auth-provider";

type Auth0Settings = {
  domain: string;
  audience: string;
  phoneClaim: string;
  /** Tests pass local keys; normally Auth0's published keys are fetched and cached. */
  keys?: JWTVerifyGetKey;
};

export function createAuth0AuthProvider(settings: Auth0Settings): AuthProvider {
  const issuer = `https://${settings.domain}/`;
  const keys = settings.keys ?? createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, keys, { issuer, audience: settings.audience });
        const phone = payload[settings.phoneClaim];
        if (typeof phone !== "string") throw new Error(`Token has no ${settings.phoneClaim} claim`);
        return { phone };
      } catch (error) {
        logger.debug({ err: error }, "Auth0 token refused");
        throw httpErrors.invalidToken();
      }
    },
  };
}
