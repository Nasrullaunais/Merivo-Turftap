# T03 WhatsApp numbers: link script and Assistant lookup

Status: done · Stories: `PLA-02` · Depends on: none · Decision: **D-25**

## Goal
A Platform Admin links a tenant's WhatsApp Business number to the tenant by running a script on the server (**D-25**). The backend uses it to send messages from that tenant's number (T04), and the Assistant uses it to find which tenant a chat belongs to (T35).

## Read first
- `docs/spec/platform-admin.md` (`PLA-02`), `docs/architecture/assistant.md` (flow diagram), `docs/architecture/tenancy.md` (platform tables).
- `apps/api/src/modules/platform/` (this table lives here and has no `tenant_id` rule of its own).

## Build
- Platform table `whatsapp_numbers`: `id`, `tenantId` (FK, unique: one number per tenant), `phoneNumberId` (Meta's id, unique), `phone` (`+94…`, unique), timestamps. "One number belongs to one tenant only."
- Scripts: `bun run whatsapp:link <tenant slug> <phone number id> <phone>` and `bun run whatsapp:unlink <tenant slug>`. They call the platform service, so the rules are the same as for the API.
- Resource `whatsapp-numbers`, **list only**, for the Assistant only, with `?phoneNumberId=` (required) and **without** `X-Tenant-Id`, because that lookup is how it finds the tenant. Reply includes `tenantId` and whether the tenant is on. Declared with a new `defineResource()` option, `forAssistantWithoutTenant`.
- Service function for T04: `numberOfTenant(tenantId)` returns the number or `undefined`.

## Not in this ticket
Screens (dropped for v1, **D-25**). Setting the number up with Meta (done by hand).

## Done when
- Route tests: staff, Platform Admins and customers get 403; the Assistant lookup works without a tenant header and returns nothing for an unknown id; a tenant that is off is reported as off.
- Service tests: a second tenant can't link a number already linked; a tenant can't link a second number; unlink frees the number.
- `bun run check` passes.
