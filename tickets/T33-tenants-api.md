# T33 Tenants API: create, turn off, list

Status: todo · Stories: `PLA-01`, `PLA-03`, `PLA-04` · Depends on: T04, T06

## Goal
A Platform Admin creates a tenant with its first Owner, turns a tenant off, and lists tenants with their status and bookings this month.

## Read first
- `docs/spec/platform-admin.md`, `docs/architecture/tenancy.md`, `apps/api/src/modules/platform/`, `apps/api/src/modules/staff/staff.service.ts` (the staff invite to reuse for the first Owner).

## Build
- `tenants` resource (platform admin only): list, get, create, update (`active`), delete turns it off. Slug: lowercase letters, numbers, hyphens; unique.
- Create also makes the first Owner and sends the welcome message from the TurfTap number with the console link (new template `ownerWelcome`).
- List item includes `bookingsThisMonth` (Colombo calendar month).
- Tenant off (`PLA-03`): every write by staff, customers and the Assistant is refused with one clear error; staff reads still work; the portal's tenant lookup reports "not available" (T27); notifications send nothing (T04).
- A way to make a user a Platform Admin: a small script (`bun run admin:add +94…`), since there is no screen for it.

## Done when
- Tests: bad slug, duplicate slug, Owner welcome queued, staff write refused when off, staff read allowed when off, booking count only counts this month.
- `bun run check` passes.
