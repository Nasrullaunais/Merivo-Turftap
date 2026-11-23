# T33 Tenant scripts: create, turn off, list

Status: todo · Stories: `PLA-01`, `PLA-03`, `PLA-04` · Depends on: T04, T06 · Decision: **D-25**

## Goal
A Platform Admin creates a tenant with its first Owner, turns a tenant off or on, and lists tenants with their status and bookings this month, by running scripts on the server (**D-25**).

## Read first
- `docs/spec/platform-admin.md`, `docs/architecture/tenancy.md`, `apps/api/src/modules/platform/`, `apps/api/src/modules/staff/staff.service.ts` (the staff invite to reuse for the first Owner).
- `apps/api/scripts/whatsapp-link.ts` (T03): the script shape to copy.

## Build
- Scripts that call the platform service: `bun run tenant:create <slug> <name> <owner phone>`, `bun run tenant:off <slug>`, `bun run tenant:on <slug>`, `bun run tenants:list`. Slug: lowercase letters, numbers, hyphens; unique.
- Create also makes the first Owner and sends the welcome message from the TurfTap number with the console link (new template `ownerWelcome`).
- The list prints each tenant's `bookingsThisMonth` (Colombo calendar month).
- Tenant off (`PLA-03`): every write by staff, customers and the Assistant is refused with one clear error; staff reads still work; the portal's tenant lookup reports "not available" (T27); notifications send nothing (T04).
- A way to make a user a Platform Admin: `bun run admin:add +94…`.

## Not in this ticket
A `tenants` API resource and console screens (dropped for v1, **D-25**).

## Done when
- Tests: bad slug, duplicate slug, Owner welcome queued, staff write refused when off, staff read allowed when off, booking count only counts this month.
- `bun run check` passes.
