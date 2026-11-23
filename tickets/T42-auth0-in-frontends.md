# T42 Auth0 sign-in in console and portal

Status: blocked (the Auth0 tenant isn't created yet) · Stories: `SIG-01` · Depends on: T29

## Goal
Both websites sign in through Auth0's passwordless phone login instead of the test form.

## Read first
- `docs/architecture/deployment.md` ("Auth0" setup steps), `docs/adr/0008-phone-login-for-everyone.md`, `docs/adr/0010-login-codes-fall-back-to-sms.md`.
- `apps/api/src/adapters/auth-provider/auth0/`.

## Build
- `lib/auth` in each app with `oidc-client-ts` (the only place it's imported). The test form stays when the app is set to fake sign-in.
- Check the open points in the setup steps: whether Auth0's free plan allows the custom phone provider, and how many wrong codes it accepts (`SIG-01` wants 3).

## Done when
- Signing in on both apps with a real phone works against the Auth0 tenant; `bun run check` passes.
