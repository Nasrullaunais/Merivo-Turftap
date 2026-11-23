# T03 WhatsApp numbers API

Status: todo · Stories: `PLA-02` · Depends on: none

## Goal
A Platform Admin links a tenant's WhatsApp Business number to the tenant. The backend uses it to send messages from that tenant's number (T04), and the Assistant uses it to find which tenant a chat belongs to (T35).

## Read first
- `docs/spec/platform-admin.md` (`PLA-02`), `docs/architecture/assistant.md` (flow diagram), `docs/architecture/tenancy.md` (platform tables).
- `apps/api/src/modules/platform/` (this table lives here and has no `tenant_id` rule of its own).

## Build
- Platform table `whatsapp_numbers`: `id`, `tenantId` (FK), `phoneNumberId` (Meta's id, unique), `phone` (`+94…`, unique), `active`, timestamps. "One number belongs to one tenant only."
- Resource `whatsapp-numbers` (all five operations) for `platform_admin` only.
- The Assistant may **list** with `?phoneNumberId=` **without** `X-Tenant-Id`, because that lookup is how it finds the tenant. Reply includes `tenantId` and whether the tenant is on. Nothing else is open to it.
- Service function for T04: `numberOfTenant(tenantId)` returns the active number or `undefined`.

## Not in this ticket
Console screens (T34). Setting the number up with Meta (done by hand).

## Done when
- Route tests: staff get 403; a second tenant can't link a number already linked; the Assistant lookup works without a tenant header and returns nothing for an unknown id.
- `bun run check` passes.
