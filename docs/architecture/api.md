# API rules

The API is resource-based ([ADR 0004](../adr/0004-resource-based-api.md)). If a new need doesn't fit these rules, raise it in the pull request instead of adding a one-off route.

## Five routes, declared once

| Route | Meaning |
|---|---|
| `GET /v1/<resource>` | List, with declared filters |
| `GET /v1/<resource>/:id` | Get one |
| `POST /v1/<resource>` | Create |
| `PATCH /v1/<resource>/:id` | Change some fields, including `status` |
| `DELETE /v1/<resource>/:id` | Delete, or turn off (`active = false`) where history matters |

Every resource is registered with one helper. Nobody writes Hono routes by hand:

```ts
export const bookingsResource = defineResource({
  name: "bookings",                                  // URL /v1/bookings, permissions bookings:<action>
  operations: ["list", "get", "create", "update"],   // no delete: bookings change status instead
  public: [],                                        // operations open without sign-in (portal browsing)
  forCustomers: ["list", "get", "create", "update"], // customers and the Assistant, limited to their own rows
  schemas: { item: Booking, create: CreateBooking, update: UpdateBooking, filters: BookingFilters },
  sort: { fields: ["startsAt", "createdAt"], default: "startsAt,asc" },
  service: bookingsService,                          // list, get, create, update (and remove for delete)
});
```

A resource may leave operations out. It may never add routes. How to write one: [backend.md](backend.md).

## Status changes go through PATCH

`PATCH /v1/bookings/42 { "status": "CANCELLED", "cancelReason": "Rain" }`

Each resource with a status declares its allowed changes in one table, in `<module>.transitions.ts`. The service calls `check()` before changing the status; anything not listed is refused with 409 (`tt_sts_001`), and an actor who isn't listed gets 403:

```ts
export const bookingTransitions = transitions<BookingStatus>({
  AWAITING_PAYMENT: { CANCELLED: ["customer", "assistant", "staff"] },
  AWAITING_CHECK:   { CANCELLED: ["staff"] },
  CONFIRMED:        { CANCELLED: ["customer", "assistant", "staff"] },
});

bookingTransitions.check(auth.actor, booking.status, input.status);
```

Changes made by the system (a receipt is sent, a hold expires) happen inside services and never go through PATCH. The status change runs as one conditional `UPDATE ... WHERE status = <expected>`. If no row changes, someone else got there first, and the reply is 409 (`tt_sts_002`). The full state tables are in [payments.md](payments.md).

## Computed and special resources

These are still resources, with only the operations that make sense:

| Resource | Operations | Why |
|---|---|---|
| `availability` | list | Free slots, computed on each request (`?resourceId=&date=`). `&slots=3` prices and checks three back-to-back slots from each start |
| `me` | get (`/v1/me`) | The signed-in user, their tenants and roles. Declared with `defineSingleton({ about: "caller" })`: one GET about the caller, with no id and no tenant header. |
| `tenant` | get (`/v1/tenant`) | The caller's tenant: `{ slug, name }`, for the portal's top bar (`POR-01`). Declared with `defineSingleton({ about: "tenant" })`: one GET with no id, open without sign-in, that needs a tenant like every other call ([tickets D-37](../../tickets/README.md#open-decisions)). |
| `files` | create | Uploads one file as a multipart form (`file`, `purpose`) and returns its id, which another resource then points at (`POST /v1/photos { fileId }`, `POST /v1/payments { kind: "TRANSFER", fileId }`). The resource declares `upload: { maxBytes }`; a body much larger is cut off with 413 before it is read. The API checks the file's first bytes, not the name or type the browser sends: photos are JPG or PNG, receipts JPG, PNG or PDF. Customers and the Assistant may upload receipts only. There is no get: download links come with the resource that uses the file, such as a photo's `url` or a payment's `receiptUrl`. |
| `whatsapp-numbers` | list | The Assistant finds which tenant a chat belongs to (`?phoneNumberId=`), before it knows the tenant. Declared with `forAssistantWithoutTenant: ["list"]`: nobody else may call it, no tenant header is needed, and the service receives a `Caller` without a tenant. Platform Admins link numbers with scripts, not the API. |
| `events` | list | A Server-Sent Events stream (the server keeps the connection open and pushes events), so the console updates without refreshing. Events carry only a type and an id; the screen refetches. See [Live updates](#live-updates-events). |

## Live updates (`events`)

`GET /v1/events` is declared with `defineStream()`, not `defineResource()`, because it stays open instead of replying once ([tickets D-11](../../tickets/README.md#open-decisions)).

- Only staff and Platform Admins of the chosen tenant may open it. A caller gets only events for their tenant, their venues (`venueIds`), and resources their role may read (`booking.changed` needs `bookings:read`).
- Each event's `data` is `{ "type": "booking.changed", "id": 42 }`, without the reply envelope. Types: `booking.changed`, `payment.changed`.
- Services call `eventsService.publish()` right after a change. Inside `transaction()` the event goes out only after the commit, so a rolled-back change sends nothing.
- A comment line goes out every 8 seconds, because Bun closes a connection that sends nothing for 10.
- Who the caller is gets checked once, when the stream opens. A staff member removed meanwhile keeps getting ids until they reconnect; any refetch they then make is refused.
- Events are not stored. After a dropped connection the console refetches everything instead of asking for what it missed.
- **One API process only.** The event bus lives in that process's memory. A second API process would not see the first one's events; it would need Postgres `LISTEN/NOTIFY` to share them.

## The one exception: vendor callbacks

Outside services that must call a fixed address use `/hooks/<vendor>/<event>`, e.g. `/hooks/auth0/send-code`. Each hook checks a shared secret. It may only call adapters and services, and it holds no business rules.

## v1 resources

Platform Admins manage tenants and WhatsApp numbers with scripts on the server in v1, so there is no `tenants` resource yet ([tickets D-25](../../tickets/README.md#open-decisions)).

| Resource | Module | Operations | Open without sign-in |
|---|---|---|---|
| `whatsapp-numbers` | platform | list, for the Assistant only | |
| `me` | platform | get | |
| `tenant` | platform | get | get |
| `staff` | staff | all | |
| `venues` | venues | all | list, get |
| `closed-dates` | venues | all | list |
| `resources` | venues | all | list, get |
| `price-rules` | venues | all | list |
| `blocked-times` | venues | all | |
| `photos` | venues | all | list |
| `customers` | customers | list, get, create, update | |
| `bookings` | bookings | list, get, create, update | |
| `repeat-series` | bookings | list, get, create, update | |
| `availability` | bookings | list | list |
| `payments` | payments | list, get, create, update | |
| `membership-plans` | memberships | all | list, get |
| `memberships` | memberships | list, get, create, update | |
| `check-ins` | memberships | list, get, create, delete (undo, only in the first 5 minutes) | |
| `files` | files | create | |
| `events` | notifications | list | |

"Open without sign-in" still needs `X-Tenant-Slug`, so the portal only ever sees one tenant's data.

## Permissions

Permission names are `<resource>:<action>`, where action is `read`, `create`, `update` or `delete`. The names live in `packages/contract/src/permissions.ts` and the table below in `apps/api/src/lib/auth/permissions.ts`. `GET /v1/me` sends each tenant's permissions, so the console hides what the API would refuse (`SIG-05`). Each role maps to a list of permissions:

| Area | Owner | Manager | Front Desk |
|---|---|---|---|
| `staff` | ✓ | read | |
| `venues` | ✓ | read | read |
| `closed-dates`, `resources`, `price-rules`, `blocked-times`, `photos`, `membership-plans` | ✓ | ✓ | read |
| `files` | ✓ | create | create |
| `customers`, `bookings`, `payments`, `memberships` | ✓ | ✓ | read, create, update |
| `check-ins` | ✓ | ✓ | read, create, delete |
| `repeat-series` | ✓ | ✓ | read |

Customers and the Assistant don't use this table. Their access is fixed in code: they see only their own bookings, memberships and payments, plus whatever the portal can open without sign-in. Of files and payments they may only upload a receipt and send it as a `TRANSFER` payment.

## Replies

Every reply uses one envelope:

```json
{ "status": 200, "message": "success", "data": {} }
{ "status": 404, "code": "tt_bkg_001", "message": "Booking 42 was not found", "traceId": "..." }
{ "status": 400, "code": "tt_htt_400", "message": "The request was invalid",
  "errors": [{ "field": "startsAt", "message": "Must be in the future" }] }
```

- **Lists:** `?page=0&size=20&sort=startsAt,asc`. `size` is at most 100. The `data` is `{ content, page, size, totalElements, totalPages }`.
- **Filters:** only the named filters a resource declares in its Zod `filters` schema. There is no generic filter language.
- **PATCH:** a field left out means "leave it". `null` means "clear it". There is a test for clearing a field.
- **Server-owned fields** never appear in create or update schemas: `id`, `tenantId`, `status` on create, a booking's price, `createdBy`, and payment results. Prices staff set, like a resource's default price, are normal fields.
- **Times** are ISO strings in UTC with `Z` (`2026-12-01T13:30:00Z`). Screens convert to the venue's time zone.
- **Money** is a whole number of cents plus a currency: `{ "amount": 250000, "currency": "LKR" }` is LKR 2,500.

## Errors

- Typed errors (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`) take a code and an English message. Business code throws them and never catches them.
- One central handler (`app.onError`) turns every error into the envelope. This is the only place an error becomes a reply.
- Codes are `tt_<area>_<nnn>`, and each module keeps its codes and English messages in `<module>.errors.ts`. Areas: `plt`, `stf`, `ven`, `cus`, `bkg`, `pay`, `mem`, `ntf`, `fil`; plus `htt` for generic HTTP errors (bad input, sign-in, routing), `dat` for database rules and `sts` for status changes, all three in `lib/`.
- One error carries an extra field. A Repeat Series with weeks that aren't free replies 409 `tt_bkg_009` with `clashingDates: ["2026-12-05", …]`, the venue's dates that clash. Sending them back in `skipDates` books the other weeks ([tickets D-10, D-26](../../tickets/README.md#open-decisions)).
- Database errors are translated once, centrally: a duplicate becomes 409 "already exists" (`tt_dat_001`), a still-referenced row becomes 409 "still in use" (`tt_dat_002`), and overlapping times become 409 "that time is already booked" (`tt_dat_003`). A module can give one constraint its own error with `constraintErrors()`.
- Unknown errors reply 500 with a plain message and the `traceId`. The full error goes to the log only.

## OpenAPI and clients

The Zod schemas in `packages/contract` are the single source of truth. `bun run gen` builds `packages/contract/openapi.json` from the `defineResource()` declarations, then generates the typed client and TanStack Query helpers in `packages/contract/src/client/` with `@hey-api/openapi-ts`. Both React apps use that client, and the n8n workflow reads `openapi.json` too. Generated files are never edited by hand; they're committed together with the schema change that produced them. A test fails if `openapi.json` is out of date, and CI fails if the client is.

The repo type-checks with TypeScript 7, but `@hey-api/openapi-ts` still needs TypeScript 6's code-building tools, which TypeScript 7 no longer ships. So `packages/contract` keeps TypeScript 6 as a dev dependency for the generator only, and its `typecheck` script calls the root TypeScript 7 `tsc`. Remove both once the generator supports TypeScript 7.
