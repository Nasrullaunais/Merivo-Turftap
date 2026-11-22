/** Checks a sign-in token. Resolves to the signed-in phone number, or throws `Unauthorized`. */
export interface AuthProvider {
  verify(token: string): Promise<{ phone: string }>;
}
