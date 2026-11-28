# Testing

## Kinds of test

| Kind | Tool | Covers |
|---|---|---|
| Service tests | `bun test` + real Postgres (Docker) | Business rules, transactions, the overlap rule, unique rules. The database is never mocked. |
| Tenant isolation | `bun test` | For every module: tenant A can't read, list, change or delete tenant B's data |
| Route tests | `bun test` + Hono's `app.request()` | Envelope, permissions per role, filters, PATCH clearing a field |
| Port contract tests | `bun test` | Every adapter of a port passes the same suite (`ports/<port>.contract-test.ts`). The S3 adapter's run needs SeaweedFS and runs only when `TEST_S3_ENDPOINT` is set. The Gemini receipt reader's run calls Google with 3 made-up receipts and runs only when `TEST_GEMINI_API_KEY` is set. The WhatsApp adapter's run sends real messages and runs only when the `TEST_WHATSAPP_*` settings are set. |
| Architecture tests | `archunit` (npm) under `bun test` and Vitest | The rules below |
| Component tests | Vitest + Testing Library | Pages with a mocked API |
| End-to-end | Playwright + axe | A few key journeys per app, phone width, accessibility |

- Test names describe behaviour: `cancel_refusesAfterCutOff`.
- Every bug fix starts with a failing test.
- Outside services always use their `fake` adapter in tests.
- API tests use the `turftap_test` database (`TEST_DATABASE_URL`), never the development one.
- Each API test run starts from empty tables. `uniquePhone()` counts up within the run, so two tests never pick the same phone number by chance.
- Story IDs (`BKG-06`) appear in the `describe` name of the tests that cover them.

## Architecture rules: API (`apps/api/src/architecture.test.ts`)

1. `lib/` imports nothing from `modules/`, `adapters/`, `hooks/` or the start-up files (`app.ts`, `wiring.ts`, `resources.ts`, `main.ts`).
2. A module imports another module only through its `<module>.service.ts`. The one exception: a `*.tables.ts` file may import another module's `*.tables.ts` to declare a foreign key.
3. A `*.routes.ts` file never imports a `*.repository.ts` file.
4. A `*.repository.ts` file never imports a `*.service.ts`, `*.routes.ts` or `ports/` file.
5. Only `adapters/<port>/<vendor>/` imports that vendor's SDK (`@aws-sdk/*`, `@google/genai`, `auth0`, WhatsApp clients).
6. Only `wiring.ts` and tests import from `adapters/`.
7. `hooks/` imports only services, ports and `lib/`.
8. Every exported function in a `*.repository.ts` takes `tenantId` as its first parameter, except in `modules/platform/` and functions whose name ends in `AcrossTenants` (see [tenancy.md](tenancy.md#queries-across-tenants)).
9. Transactions (`db.transaction`) are opened only in `*.service.ts`.
10. No circular imports.
11. Only `lib/`, `hooks/` and `app.ts` import `hono`, so a module can't add a route of its own.
12. Nothing under `modules/` uses `try`/`catch` or `.catch()`: business code throws and the central handler replies.
13. A module whose tables have a `venueId` or `resourceId` column has a `*.venue-scope.test.ts`, which signs in as staff limited to venue A and tries to read, list, change and delete venue B's data.

The same file checks error codes: every code is `tt_<area>_<nnn>`, a module's codes live in its `<module>.errors.ts` and use its area, and no code is used by two module errors.

Rules 2, 7, 8, 9, 11 and 12 read the source text; the rest use `archunit`.

## Architecture rules: React apps

Listed in [frontend.md](frontend.md#rules-checked-by-srcarchitecturetestts). Each app has its own `src/architecture.test.ts` run by Vitest.
