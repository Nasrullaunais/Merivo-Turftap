# T01 Customers API

Status: done · Stories: supports `BKG-04`, `MEM-05`, `POR-03` · Depends on: none · Decisions: **D-22**, **D-23**, **D-24**

## Goal
Each tenant keeps its own record of each customer, linked by phone number. Staff can find a customer by phone or name. Later tickets (walk-ins, check-ins, portal, Assistant) all build on this.

## Read first
- `docs/architecture/backend.md` (step by step for a new resource); copy the `venues` module shape.
- `docs/architecture/tenancy.md`, `docs/adr/0011-staff-limited-to-venues.md` (customers are tenant-wide, not venue-scoped).
- `docs/architecture/api.md` (permissions table: `customers` row).

## Build
- New module `apps/api/src/modules/customers/` with `customers` table: `tenantId`, `phone` (`+94…`), `name`, timestamps. Unique index on `(tenant_id, phone)`.
- Resource `customers`: list, get, create, update (no delete). Filters: `phone` (exact, uses `PhoneInput`) and `search` (name or phone contains). Sort by name.
- Contract in `packages/contract/src/customers.ts`; permissions in `STAFF_RESOURCES` and `ROLE_PERMISSIONS` (Owner, Manager all; Front Desk read, create, update).
- Errors in `customers.errors.ts` (area `cus`); a duplicate phone gets its own message via `constraintErrors()`.
- Service function other modules will call: `findOrCreateByPhone(auth, phone, name)` for walk-ins (`BKG-04`). An existing customer with that phone is reused; the name is not overwritten.
- `bun run gen`.

## Not in this ticket
Customers or the Assistant calling this resource (T02). Any console screen (customers appear inside the walk-in and check-in screens).

## Done when
- Service, route and tenancy tests pass, including: duplicate phone in one tenant refused; the same phone allowed in two tenants; a limited Manager still finds every customer.
- `bun run check` passes.
