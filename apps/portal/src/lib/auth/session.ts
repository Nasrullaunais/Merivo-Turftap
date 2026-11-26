const TOKEN_KEY = "turftap.accessToken";
const TEST_TOKEN_PREFIX = "fake:";
const listeners = new Set<() => void>();

export function getAccessToken(): string | undefined {
  return sessionStorage.getItem(TOKEN_KEY) ?? undefined;
}

export const isSignedIn = () => getAccessToken() !== undefined;

/** Lets a page re-render when the customer signs in or out. */
export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test sign-in: the API accepts `fake:<phone>` only when it runs with AUTH_PROVIDER=fake. */
export function signInForTesting(phone: string): void {
  sessionStorage.setItem(TOKEN_KEY, `${TEST_TOKEN_PREFIX}${phone}`);
  listeners.forEach((listener) => listener());
}

export function signOut(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  listeners.forEach((listener) => listener());
}
