# T40 WhatsApp Cloud adapter

Status: blocked (D-52) · Stories: `SIG-01`, `AST-07` · Depends on: T04

## Goal
Login codes and customer messages really go out on WhatsApp through Meta's Cloud API.

## Read first
- `docs/architecture/adapters.md`, `docs/architecture/assistant.md` (templates), `apps/api/src/ports/messaging-channel.ts`.

## Build
- `adapters/messaging-channel/whatsapp-cloud/` with plain `fetch` (no SDK needed). Sends `text`, `template` (values in order) and `login-code` (Meta's authentication template).
- Config: access token, the TurfTap number's phone number id, API version. Missing secret stops start-up.
- A messaging port contract test the fake and this adapter both pass; the real run only when `TEST_WHATSAPP_*` is set.
- A short how-to in `docs/architecture/deployment.md`: creating the Meta app, registering each template in `WHATSAPP_TEMPLATES`.
- n8n on the server (moved here from T35): add it to `compose.prod.yaml`, its webhook behind Caddy and its editor behind basic auth, with the settings in `docs/architecture/assistant.md#settings` and `n8n/schema.sql` applied. Point the Meta app's webhook at it. Pretend Meta is never loaded there.

## Done when
- A real login code arrives on your phone from a test number; `bun run check` passes without keys.

## Where it stands
- Built: the adapter, the shared contract test, `bun run whatsapp:templates` and the setup guide. The 11 customer templates are with Meta for review; staff invites and the Owner welcome are dropped (D-51, T50).
- Blocked (D-52): Meta refuses `login_code` and blocks sending until Merivo passes Business Verification, which waits for Merivo's registration. Then: run `bun run whatsapp:templates`, send a real login code, and check which HTTP status codes Meta uses for its errors (the offline tests guess).
- Not started: n8n on the server. It waits for D-52 too, since Meta blocks the Assistant's replies until then.
