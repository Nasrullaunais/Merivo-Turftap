# T35 Assistant skeleton: tenant, customer, name, hand-over

Status: done · Stories: `AST-05`, `AST-06` · Depends on: T02, T03 · Decision: **D-17**

## Goal
The n8n workflow receives a WhatsApp message from Meta, finds the tenant and the customer, asks a new number for their name once, and replies with the venue's phone number when it can't help.

## Read first
- `docs/architecture/assistant.md` (whole page), `docs/adr/0006-n8n-receives-chats.md`.
- The GenexoAI WhatsApp bot design (path in the project memory notes) for the channel-neutral core.

## Build
- Workflow in n8n (local at `:5679`): Meta webhook (with Meta's verify step) → normalise (phone in `+94` format, text, photo) → `GET /v1/whatsapp-numbers?phoneNumberId=` → tenant off: no reply → `GET /v1/customers?phone=` → unknown: ask name, `POST /v1/customers`.
- Every API call sends the assistant key, `X-Tenant-Id`, `X-Customer-Phone`. Credentials live in n8n, never in the export.
- Hand-over reply with the venue's phone number (one venue: its number; several: ask which, or list them).
- Export to `n8n/workflows/assistant.json` and commit. Write a manual test checklist next to it (**D-17**).

## Done when
- The manual checklist passes against local n8n with a fake Meta request (a `curl` sample in the checklist).
- `bun run check` passes.

## How it was built
- Locally a second workflow, **pretend Meta**, stands in for Meta's send address, and the GenexoAI chat emulator (`tools/chat-emulator`) sends Meta-shaped, signed messages (**D-42**).
- The workflow checks Meta's signature, answers 200 at once, then sends the reply separately.
- n8n on the server moved to T40, since it does nothing there without the real WhatsApp connection.
