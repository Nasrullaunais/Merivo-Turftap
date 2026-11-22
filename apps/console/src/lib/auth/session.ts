import { clearActiveTenantId } from "../tenant/activeTenant";

const TOKEN_KEY = "turftap.accessToken";
const TEST_TOKEN_PREFIX = "fake:";

export function getAccessToken(): string | undefined {
  return sessionStorage.getItem(TOKEN_KEY) ?? undefined;
}

export const isSignedIn = () => getAccessToken() !== undefined;

/** Test sign-in: the API accepts `fake:<phone>` only when it runs with AUTH_PROVIDER=fake. */
export function signInForTesting(phone: string): void {
  sessionStorage.setItem(TOKEN_KEY, `${TEST_TOKEN_PREFIX}${phone}`);
}

export function signOut(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  clearActiveTenantId();
}
