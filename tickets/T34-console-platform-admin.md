# T34 Platform admin screens

Status: todo · Stories: `PLA-01` to `PLA-04` · Depends on: T33

## Goal
In the Staff Console, a Platform Admin sees the tenant list, creates a tenant, turns one off or on, and links its WhatsApp number.

## Read first
- `docs/architecture/frontend.md` ("A Platform Admin with no tenant still opens the console").

## Build
- Feature `features/platform/`: tenants table (name, slug, status, bookings this month), create form (name, slug, Owner phone), on/off toggle with a confirm, WhatsApp number form per tenant.
- Menu shows these only for Platform Admins.

## Done when
- Component tests for create (bad slug message), turn off, link number (already linked message).
- `bun run check` passes.
