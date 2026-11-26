# TurfTap

Multi-tenant booking platform for sports venues in Sri Lanka: courts and tables booked by the slot, gym memberships, payment by bank transfer. Customers use the Customer Portal or the WhatsApp Assistant. Staff use the Staff Console.

Bun workspace: `apps/api` (Bun + Hono + Drizzle + Postgres), `apps/portal` and `apps/console` (React), `packages/contract` (Zod schemas + generated API client), `packages/ui` (shared UI), `n8n/workflows` (the Assistant).

## Read before working

- **Business words**: [GLOSSARY.md](GLOSSARY.md). Use these words, and only these, in code, screens, tests and pull requests. A new or changed term gets updated there first.
- **What to build**: [docs/spec/](docs/spec/README.md). Stories have IDs (`BKG-06`); reference them in tests and pull requests.
- **Why things are the way they are**: [docs/adr/](docs/adr/README.md). Work that goes against an ADR says so openly in the pull request.
- **How it fits together**: [docs/architecture/](docs/architecture/README.md). Open the page for the area you're touching: tenancy, API, adapters, frontend, Assistant, payments, testing, deployment.
- **How the Staff Console looks and behaves**: [docs/architecture/console-design.md](docs/architecture/console-design.md). Every console screen follows it.
- **How to write backend code**: [docs/architecture/backend.md](docs/architecture/backend.md). The `venues` module is the working example to copy.

## Commands

Run from the repo root. Scripts live in the root `package.json`.

```bash
cp .env.example .env     # once; the defaults work locally
bun install
docker compose up -d     # Postgres :5433, SeaweedFS :8334, n8n :5679
bun run db:migrate       # apply migrations
bun run db:seed          # demo tenant "demo"; sign in as its Owner with "Bearer fake:+94770000001"
bun run dev              # API :3000, portal :5173 (?tenant=demo), console :5174
bun run check            # lint, format, type check, all tests including architecture tests
bun run gen              # after a contract or resource change: openapi.json + frontend client
bun run db:generate      # after a *.tables.ts change: writes a migration to read and commit
bun run format <files>   # format the files you touched
cd apps/api && bun test venues.service -t "create_"   # one file, tests named like this
```

## Done means

- `bun run check` passes.
- A new resource: every step of [Adding a resource](docs/architecture/backend.md#adding-a-resource-step-by-step) is done.
- `bun run gen` output and new migrations (read first) are committed with the change.
- A changed rule, term or flow is updated in the glossary, spec, ADR or architecture page.

## Core rules

**API.** Resources come only from `defineResource()`: at most list, get, create, PATCH and delete under `/v1/<resource>`, with actions as PATCHes of `status`. Vendor callbacks in `hooks/` are the one exception. Details: [api.md](docs/architecture/api.md).

**Backend module layout.**

```
apps/api/src/modules/bookings/
├── bookings.routes.ts        # defineResource() declarations only
├── bookings.service.ts       # business rules; the only place transaction() is called
├── bookings.repository.ts    # SQL only through db(); tenantId is the first argument of every function
├── bookings.tables.ts        # Drizzle tables
├── bookings.transitions.ts   # allowed status changes and who may make them
├── bookings.errors.ts        # tt_bkg_NNN codes and English messages
├── bookings.jobs.ts          # background jobs (defineJob), if any
├── bookings.service.test.ts  # business rules against a real database
├── bookings.routes.test.ts   # envelope, permissions per role, filters
└── bookings.tenancy.test.ts  # tenant A can't touch tenant B's data
```

Request and reply schemas live in `packages/contract/src/<module>.ts`. Modules use each other only through `<module>.service.ts`.

**Tenants.** A leak between tenants is the worst bug here. The tenant comes from the caller's `AuthContext`, never the body or URL, and every query filters on `tenant_id` in the SQL; staff limited to some venues work the same way with `venueIds`. Details: [tenancy.md](docs/architecture/tenancy.md).

**Outside services.** Auth0, file storage, WhatsApp, Gemini and payment providers are reached only through `ports()`, and each has a `fake` adapter for tests. Details: [adapters.md](docs/architecture/adapters.md).

**Errors.** Business code throws a typed error from its `<module>.errors.ts` and never catches; one central handler writes the reply. Details: [backend.md](docs/architecture/backend.md#errors).

**Data.** Money is an integer of cents plus a currency. Times are `timestamptz`, sent as ISO strings with `Z`, and shown in the venue's time zone. Phone numbers are stored as `+94771234567`. Duplicates are caught by unique indexes, not by "check first, then insert". State changes are one conditional `UPDATE ... WHERE status = <expected>`. Jobs are queued inside the same transaction as the data they act on.

**Migrations.** Plain SQL in `apps/api/migrations/`, generated by `drizzle-kit` and read before committing, applied by `bun run db:migrate` ([ADR 0009](docs/adr/0009-drizzle-migrations.md)). Structure only; seed data lives in seed scripts.

**Frontend.** Features never import each other. Server data goes through TanStack Query. All text lives in `i18n/en/`. Details: [docs/architecture/frontend.md](docs/architecture/frontend.md).

**Architecture tests** in `apps/*/src/architecture.test.ts` enforce the rules above. When one fails, fix the code to follow the rule. A rule changes only alongside an ADR or architecture-doc update in the same pull request. Rule list: [docs/architecture/testing.md](docs/architecture/testing.md).

## Decisions

Pick the simplest design that meets the story. Each extra layer, library, option or abstraction needs a reason you can state in one sentence; without one, leave it out.

When a choice is hard to undo, changes how others work, or picks between real trade-offs (a library, a data shape, a rule exception, a version), stop and ask the user before building it. Give the context, the options, what each one changes for the project, and your recommendation. Smaller choices: follow the usual default and list them in your final summary.

## Tests

A good test fails when the behaviour breaks and keeps passing when the code is only reorganised.

- **Check real outcomes.** Assert on what a user or caller sees: the reply, the saved row, the error code. A test that only repeats the code's own logic, or checks that a mock returned what it was told to return, proves nothing.
- **Test through the public surface.** Call the route or the service, not private helpers, and leave call order and internal function names out of assertions, so a refactor that keeps the behaviour keeps the tests green.
- **Keep fakes honest.** Use the real database and the port's `fake` adapter, which passes the same contract tests as the real one. A hand-written mock or test fixture copies real shapes, status codes and errors; when you can't confirm what the real thing returns, check it before writing the test.
- **Watch it fail.** Before trusting a new test, break the behaviour it covers and see it go red.
- **Names describe behaviour**: `cancel_refusesAfterCutOff`. Bug fixes start with a failing test.

## Style

- TypeScript `strict`. Every `any` carries a one-line reason.
- Name magic numbers: `const RECEIPT_TIME_LIMIT_MINUTES = 30`.
- Write a comment only where a future developer would be confused without it, two lines at most. If it needs more, simplify the code.
- Format and lint only the files you touch.
- Dependencies use their latest stable release. Holding one back is a decision for the user (see Decisions), and the reason is written in the docs.
- Pull requests: one topic, a short plain description, story IDs listed.

## Some notes

- No sudden movements in the UI on transitions or changes, everything should happen though a smooth motion, a well thoughout flow.
- UI should be modern, colorful with meaning. 
- page initial load should have a nice animation, not a random movement.
- give careful thought to the UX, less clicks/typing. more selecting an option when appropraite. dont slam the user with a large form, take the user through it step by step. 
- the UI structure and hierachy should give the most guidance to the user, not words.
- make sure every click and hovers are greeted. mobile and tablets should be fully supported.
