# T27 Portal shell, unknown address, phone layout

Status: done · Stories: `POR-01`, `POR-05` · Depends on: none

## Goal
The Customer Portal has its frame: the tenant's name at the top, phone-first layout, a "venue not found" page for an unknown address, and a "not available" page for a tenant that is off.

## Read first
- `docs/spec/customer-portal.md`, `docs/architecture/frontend.md`.
- `apps/portal/src/` (today: one page listing venues), `apps/portal/src/lib/tenant/tenantSlug.ts`.

## Build
- `layout/` shell: top bar with tenant name, simple mobile nav. Works at 360 px wide.
- The tenant's name and state need a public read. Add the smallest thing that fits the API rules, such as a public `get` on a tenant-info singleton; propose it in the pull request (api.md: "raise it instead of adding a one-off route").
- Unknown slug → "venue not found" page. Tenant off → "not available" page (`PLA-03` portal part; the API side is T33, so until then test with the API's current "not found").
- Text in `i18n/en/`.

## Built
- `GET /v1/tenant` (**D-37**) and the "not available" error for portal callers (**D-38**).
- The bottom nav was left for T31: with one page there is nothing to switch between, so a bar with one button would only take space.

## Done when
- Component tests for both pages and the shell at phone width.
- `bun run check` passes.
