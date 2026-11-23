# T26 Memberships end, and reminders

Status: todo · Stories: `MEM-06` · Depends on: T23

## Goal
Memberships past their end date change state every night, and customers get a WhatsApp message 3 days before theirs ends.

## Read first
- `docs/architecture/payments.md` ("Scheduled jobs").

## Build
- A daily job at 00:05 `Asia/Colombo` (pg-boss schedule): `ACTIVE` with `endsOn` before today → the ended state from D-08.
- A daily job: memberships ending in exactly 3 days, not already renewed → template `membershipEndingSoon`.
- Both jobs loop over tenants that are on (from the platform service) and run the tenant's own query, so every repository function still takes `tenantId` first. (`…AcrossTenants` is only for the signed-in user's own rows, see `tenancy.md`.)
- `MEMBERSHIP_REMINDER_DAYS = 3`.

## Done when
- Tests run the handlers directly: one ends, one doesn't; reminder skipped when a renewal exists; nothing sent for a tenant that is off.
- `bun run check` passes.
