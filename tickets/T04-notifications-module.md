# T04 Notifications module

Status: done · Stories: `AST-07` · Depends on: T01, T03 · Decision: **D-04**

## Goal
One place sends every WhatsApp message about a booking or membership, from the tenant's own number, as a queued job so a message is only sent for data that really saved.

## Read first
- `docs/architecture/assistant.md` ("Messages the backend sends": templates, 24-hour window).
- `docs/architecture/backend.md` ("Background jobs"); `apps/api/src/modules/staff/staff.jobs.ts` is the working example.
- `apps/api/src/ports/messaging-channel.ts` (`WHATSAPP_TEMPLATES`, `OutgoingMessage`).

## Build
- Module `apps/api/src/modules/notifications/` (area `ntf`): `notifyCustomer(auth, { customerId, template, values })` queues a `send-message` job inside the caller's transaction.
- The job handler looks up the customer's phone and the tenant's number (`numberOfTenant`, T03), then sends a **template** message through `ports().messaging`.
- No linked number: follow **D-04** (recommended: don't send, log a warning with tenant id).
- Add an entry to `WHATSAPP_TEMPLATES` only when a ticket needs it; each later ticket adds its own (booking expired, confirmed, rejected, cancelled, reminder…). Write each template's wording next to its name so it can be registered with Meta.
- A tenant that is off sends nothing.

## Not in this ticket
Any real message being triggered (each booking or payment ticket adds its own). The real WhatsApp adapter (T40).

## Done when
- Service tests with the fake messaging channel: a message queued in a rolled-back transaction is never sent; a sent message comes from the tenant's number; no number follows D-04.
- `bun run check` passes.
