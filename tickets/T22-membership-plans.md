# T22 Membership Plans (API + console)

Status: done · Stories: `MEM-01` · Depends on: none

## Goal
A Manager creates Membership Plans for a venue (name, length in days or months, price) and can turn one off. Existing memberships keep working.

## Read first
- `docs/spec/memberships.md` (`MEM-01`), glossary "Membership Plan" (a venue sells it).
- `apps/api/src/modules/venues/resources.service.ts` and console `features/resources/` (the closest sibling: venue-owned, has a price, can be turned off).

## Build
- Module `apps/api/src/modules/memberships/` (area `mem`). Table `membership_plans`: `tenantId`, `venueId`, `name`, `lengthCount`, `lengthUnit` (`DAYS`, `MONTHS`), price (`priceColumns`), `active`. Unique name per venue among active plans.
- Resource `membership-plans`: all five operations; delete turns it off. Public: list, get (only active plans for the public). Venue-scope test.
- Console: a Membership Plans page under a new Memberships sidebar section (the first section with sub-pages), plans grouped by venue, add form, turn off. (Chosen with the user over "on the venue page", to match console-design.md §5.1.)
- Length limits: 1–365 days or 1–24 months (`MAX_PLAN_LENGTH` in the contract).
- Permissions from `api.md`.

## Done when
- Service, route, tenancy and venue-scope tests; component test for adding and turning off a plan.
- `bun run check` passes.
