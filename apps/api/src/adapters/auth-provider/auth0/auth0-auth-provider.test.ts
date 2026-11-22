import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";

import { authProviderContract } from "../../../ports/auth-provider.contract-test";
import { createAuth0AuthProvider } from "./auth0-auth-provider";

const DOMAIN = "turftap-test.auth0.com";
const AUDIENCE = "https://api.turftap.lk";

authProviderContract("auth0", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" };
  return {
    provider: createAuth0AuthProvider({
      domain: DOMAIN,
      audience: AUDIENCE,
      phoneClaim: "phone_number",
      keys: createLocalJWKSet({ keys: [jwk] }),
    }),
    tokenFor: (phone) =>
      new SignJWT({ phone_number: phone })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(`https://${DOMAIN}/`)
        .setAudience(AUDIENCE)
        .setExpirationTime("5m")
        .sign(privateKey),
  };
});
