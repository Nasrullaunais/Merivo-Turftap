# Writing backend code

How code inside `apps/api` is written. The `venues` module is the working example: when adding a module, copy its shape. Rules here are checked by `apps/api/src/architecture.test.ts` where a test can check them.

## Adding a resource, step by step

1. **Contract** (`packages/contract/src/<module>.ts`): Zod schemas for the item, create, update and filters. Give each body schema an id with `.meta({ id: "Venue" })` so it gets a name in OpenAPI.
2. **Tables** (`<module>.tables.ts`): Drizzle tables. Every tenant table starts with `tenantId: tenantIdColumn()` and has an index on it.
3. **Migration**: `bun run db:generate`, then read the SQL file it wrote before committing ([ADR 0009](../adr/0009-drizzle-migrations.md)).
4. **Errors** (`<module>.errors.ts`): the module's error codes and English messages.
5. **Repository** (`<module>.repository.ts`): one function per query, `tenantId` first.
6. **Service** (`<module>.service.ts`): business rules and transactions.
7. **Routes** (`<module>.routes.ts`): one `defineResource()` call per resource, each added to `src/resources.ts`. A module with several resources keeps each one's service and repository in its own files: `venues/resources.service.ts` and `venues/resources.repository.ts`.
8. **Permissions**: add the resource to `STAFF_RESOURCES` and `ROLE_PERMISSIONS` in `lib/auth/permissions.ts`, matching the table in [api.md](api.md#permissions).
9. **Generate**: `bun run gen` rewrites `openapi.json` and the frontend client. Commit both.
10. **Tests**: service tests, route tests and a tenant-isolation test (see `venues.*.test.ts`).

## Schemas: one definition, three uses

A schema in `packages/contract` checks the request on the server, describes the API in `openapi.json`, and can check a form in React.

```ts
export const Venue = z.object({ id: Id, name: z.string(), createdAt: Timestamp, ... }).meta({ id: "Venue" });
export const CreateVenue = z.object({ name: z.string().trim().min(1), phone: PhoneInput, ... }).meta({ id: "CreateVenue" });
export const UpdateVenue = z.object(venueFields).partial().meta({ id: "UpdateVenue" });
```

- **Item** schemas describe what is stored. They have no `.transform()`, because replies are written with `z.encode()`, which can't undo a transform. Fields not in the item schema (like `tenantId`) are dropped from the reply.
- **Create** and **update** schemas may clean input: `PhoneInput` turns "077 123 4567" into `+94771234567`.
- **Update** schemas are built from the plain fields, never from the create schema, so a field with a create default isn't reset when a PATCH leaves it out.
- Shared pieces live in `common.ts`: `Id`, `Timestamp` (ISO text with `Z` on the wire, `Date` in code), `Money`, `PhoneNumber`, `PhoneInput`, `LocalTime`, `QueryBoolean`.
- Server-owned fields (`id`, `tenantId`, `status` on create, a booking's price, payment results) never appear in create or update schemas.
- Prices staff type in use `PriceInput` (whole rupees above zero). Tables store them with `priceColumns()` from `lib/db/columns.ts`, and the repository turns the two columns back into `Money` with `priceOf()`.

## Routes: `defineResource()`

```ts
export const venuesResource = defineResource({
  name: "venues",                                   // URL /v1/venues, permissions venues:<action>
  operations: ["list", "get", "create", "update", "delete"],
  public: ["list", "get"],                          // open without sign-in, still needs a tenant
  schemas: { item: Venue, create: CreateVenue, update: UpdateVenue, filters: VenueFilters },
  sort: { fields: VENUE_SORT_FIELDS, default: "name,asc" },
  service: venuesService,                           // needs list, get, create, update, remove
});
```

For each route it: checks who may call it, parses the id, query and body with Zod (a mismatch is a 400 listing every bad field), calls one service function, and writes the reply in the envelope. TypeScript checks that the service's functions match the schemas. Unknown query parameters are refused, so a mistyped filter fails instead of quietly returning everything.

Resources that customers or the Assistant may call list those operations in `forCustomers`; the service then limits them to the customer's own rows.

## Services

```ts
export function update(auth: AuthContext, id: number, input: UpdateVenue) {
  return transaction(async () => {
    const venue = await venuesRepository.update(auth.tenantId, id, auth.venueIds, input);
    if (!venue) throw venueErrors.notFound(id);
    return venue;
  });
}
```

- A service function takes `auth` first. The tenant is always `auth.tenantId`, and the venues the caller may use are `auth.venueIds` ([tenancy.md](tenancy.md#staff-limited-to-some-venues)).
- **Writes run inside `transaction()`.** Every repository call and queued job inside it shares one connection, and database rule violations (duplicate name, overlapping booking) come out as our own errors. Calling `transaction()` inside another one just joins it.
- Reads can skip the transaction.
- Other modules are reached through their service: `import * as staffService from "../staff/staff.service"`.
- If two modules need each other, the part one of them needs moves to a second service file, so the imports don't go in a circle. Example: `platform/users.service.ts`, used by `staff`, while `platform.service.ts` uses `staff`.
- Outside services are reached through `ports()`: `await ports().storage.save(key, file)`. Never import an adapter.

## Repositories

```ts
export async function findById(tenantId: number, id: number, venueIds: number[] | undefined) {
  const [venue] = await db().select().from(venues).where(ownedBy(tenantId, id, venueIds));
  return venue;
}
```

- `tenantId` is the first parameter of every exported function (except in `modules/platform/`, whose tables have no tenant, and the rare `*AcrossTenants` function described in [tenancy.md](tenancy.md#queries-across-tenants)).
- Functions that read or change venue data take a required `venueIds` and put it in the `WHERE` next to `tenant_id` (`inVenues()` in each venues repository).
- Use `db()`, never a connection passed in: it is the open transaction if there is one.
- "Find" functions return `undefined` when nothing matches. The service decides that this is a 404.
- Lists use `pageOf()` and `sortBy()` from `lib/db`. Sort text columns by `sql\`lower(column)\`` so names sort the way people expect.
- Rules about overlapping times live in the database as an `EXCLUDE` constraint, written by hand ([ADR 0009](../adr/0009-drizzle-migrations.md)). `price_rules_no_overlap` is the working example; it uses the `btree_gist` and `intarray` Postgres extensions. To name the row that clashes, the service looks for it first, after locking the resource with `resourcesService.get(auth, id, "update")`. The lock makes a second save on that resource wait, then find the first one and name it. It also keeps apart clashes no constraint can see, such as a booking and a Blocked Time saved together. Without it, two clashing inserts at once can deadlock in Postgres and reply 500. The constraint stays as a last guard.
- A rule that adds up rows, such as a booking's balance, locks the row they belong to before reading them (`bookingsService.get(auth, id, "update")`), so two saves at once can't both pass the check. `payments.service.ts` is the working example.
- State changes are one conditional UPDATE: `.where(and(ownedBy(tenantId, id), eq(bookings.status, expected)))`. No row back means someone else got there first: throw `statusChangedMeanwhile()`.

## Errors

Business code throws and never catches. One handler (`lib/http/error-handler.ts`) turns every error into the reply.

```ts
// venues.errors.ts
export const venueErrors = {
  notFound: (id: number) => new NotFound("tt_ven_001", `Venue ${id} was not found`),
  nameTaken: () => new Conflict("tt_ven_002", "Another venue already has this name"),
};

constraintErrors({ venues_tenant_name_unique: venueErrors.nameTaken });
```

- The error types are `BadRequest` (400), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404) and `Conflict` (409), each with a code and an English message.
- Codes are `tt_<area>_<nnn>`. Each module's codes live only in its `<module>.errors.ts`, use its area, and are never reused. The architecture test checks all three.
- `constraintErrors()` gives a database constraint its own error. Without it, a duplicate becomes the generic `tt_dat_001` "This already exists".
- Errors that belong to no module are in `lib/errors/http-errors.ts`: `tt_htt_*` for bad input, sign-in and routing, `tt_dat_*` for database rules.
- `try`/`catch` and `.catch()` are refused anywhere under `modules/`. They belong at real edges: adapters, job handlers, hooks and `lib/`.
- An unknown error replies 500 with a plain message and the `traceId`. The full error goes to the log only.

## Status changes

```ts
export const bookingTransitions = transitions<BookingStatus>({
  AWAITING_PAYMENT: { CANCELLED: ["customer", "assistant", "staff"] },
  CONFIRMED: { CANCELLED: ["customer", "assistant", "staff"] },
});

// in the service, inside transaction():
bookingTransitions.check(auth.actor, booking.status, input.status);   // 409 or 403 if not allowed
const changed = await bookingsRepository.setStatus(auth.tenantId, id, booking.status, input.status);
if (!changed) throw statusChangedMeanwhile();
```

## Background jobs

```ts
// bookings.jobs.ts
export async function expireBooking({ tenantId, bookingId }: ExpireData) {
  const booking = await bookingsRepository.findById(tenantId, bookingId);   // re-checks the current state
  ...
}
export const expireBookingJob = defineJob<ExpireData>("expire-booking", expireBooking);

// in the service, inside transaction():
await expireBookingJob.queue({ tenantId, bookingId }, { startAfter: deadline });
```

The handler uses the repository, not the service: the service imports the job to queue it, so the other way round would be an import circle. `staff.jobs.ts` is a working example.

A job queued inside `transaction()` is saved with the data, so it never runs for a row that didn't save. Handlers must check the row's state when they run, because things may have moved on.

A job gets a queue and a worker only if its file is loaded before `startJobs()`. `app.ts` loads most of them through the routes; a jobs file no route loads, like `notifications.jobs.ts`, is imported in `app.ts` directly.

## Live updates

A service that changes a booking or payment tells open consoles, right after the repository call:

```ts
eventsService.publish(auth, "booking.changed", booking);   // notifications/events.service.ts
```

Inside `transaction()` the event goes out only once the transaction commits. A new kind of change adds its type to `LIVE_EVENT_TYPES` in `packages/contract/src/events.ts`, and to the read permission it needs in `events.service.ts`. Details: [api.md](api.md#live-updates-events).

## Ports and adapters

See [adapters.md](adapters.md). `wiring.ts` picks the adapters from config and calls `installPorts()` at start-up; tests install fakes in `src/test/setup.ts`. Services call `ports()`.

## Config, time and logs

- Date and clock-time maths goes through `lib/time.ts` (`todayIn`, `addDays`, `weekdayOf`, `instantAt`). A venue's dates and times are its own clock (`venue.timeZone`), never the server's.
- Settings are read once in `lib/config.ts` and checked by Zod. A missing secret stops the app. Fake adapters are refused when `NODE_ENV=production`.
- `logger` from `lib/logger.ts` writes JSON. Every line written during a request or job carries its `requestId`, which errors return as `traceId`.

## Tests

- `bun test` in `apps/api` uses the `turftap_test` database (never the development one), runs migrations first, empties every table, installs fake ports and creates the job queues without working them. A test that needs a job's effect runs its handler itself (see `staff.routes.test.ts`). A second `bun test` on the same database waits until the first one ends.
- `src/test/fixtures.ts` has `createTenant()` (a tenant with an Owner, Manager and Front Desk), `venueInput()` and `call()`, which sends a request through the whole app signed in with the fake auth provider (`Bearer fake:+94771234567`).
- Each module has service tests, route tests and a `<module>.tenancy.test.ts`.
