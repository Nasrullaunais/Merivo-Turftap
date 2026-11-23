# T40 WhatsApp Cloud adapter

Status: todo · Stories: `SIG-01`, `SIG-03`, `AST-07` · Depends on: T04

## Goal
Login codes, staff invites and customer messages really go out on WhatsApp through Meta's Cloud API.

## Read first
- `docs/architecture/adapters.md`, `docs/architecture/assistant.md` (templates), `apps/api/src/ports/messaging-channel.ts`.

## Build
- `adapters/messaging-channel/whatsapp-cloud/` with plain `fetch` (no SDK needed). Sends `text`, `template` (values in order) and `login-code` (Meta's authentication template).
- Config: access token, the TurfTap number's phone number id, API version. Missing secret stops start-up.
- A messaging port contract test the fake and this adapter both pass; the real run only when `TEST_WHATSAPP_*` is set.
- A short how-to in `docs/architecture/deployment.md`: creating the Meta app, registering each template in `WHATSAPP_TEMPLATES`.

## Done when
- A real login code arrives on your phone from a test number; `bun run check` passes without keys.
