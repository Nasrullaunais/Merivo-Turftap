# Tenancy

All tenants share the same tables. Every tenant-owned row has a `tenant_id` ([ADR 0005](../adr/0005-tenant-id-per-row.md)). A leak between tenants is the worst bug this system can have.

## Platform tables vs tenant tables

| Kind | Tables | Has `tenant_id` |
|---|---|---|
| Platform | `tenants`, `users`, `whatsapp_numbers` | No |
| Tenant | everything else (`staff`, `venues`, `customers`, `bookings`, ...) | Yes, `NOT NULL`, indexed |

A **User** (one phone number) is platform-wide. Their link to a tenant is a `staff` row (with a role) or a `customers` row. The same phone can have both, at different tenants.

## The rules

1. The tenant comes from **who is calling**, never from the request body or a URL id.
2. Every repository function takes `tenantId` as its **first** argument and puts it in the `WHERE`.
3. Reads check ownership **inside the SQL**: `WHERE id = $1 AND tenant_id = $2`. Another tenant's row returns 404, the same as a missing one.
4. Unique rules include the tenant: `UNIQUE (tenant_id, lower(name)) WHERE active`.
5. Every module has a test that signs in as tenant A and tries to read, list, change and delete tenant B's data.

No Postgres Row Level Security in v1. Rules 2 and 5 are the safety net.

## How each caller's tenant is found

Every request ends up with one `AuthContext`, built once in the auth middleware:

```ts
type Caller = {
  actor: "staff" | "customer" | "assistant" | "platform_admin" | "public" | "system";
  tenantId?: number;    // missing until the caller names a tenant
  userId?: number;      // staff, customer, platform_admin
  role?: StaffRole;     // staff only
  venueIds?: number[];  // staff limited to some venues; missing means every venue
  customerId?: number;  // customer, assistant (acting for a customer)
};

type AuthContext = Caller & { tenantId: number }; // what services receive
```

`public` means not signed in. `defineResource()` refuses a request whose tenant is unknown before any service runs, so services always get a `tenantId`. The code is in `modules/platform/platform.service.ts` (`resolveCaller`).

| Caller | Proves who they are with | Tenant comes from | Check |
|---|---|---|---|
| Staff (console) | Auth0 token | `X-Tenant-Id` header | The user has a `staff` row in that tenant |
| Platform Admin (console) | Auth0 token | `X-Tenant-Id` header, only for tenant pages | The user is flagged platform admin |
| Customer (portal) | Auth0 token | `X-Tenant-Slug` header, which the portal takes from its own web address | The tenant exists and is on. A `customers` row is created on first booking. |
| Assistant (n8n) | Assistant key | `X-Tenant-Id` header | The tenant is on. `X-Customer-Phone` names the customer it acts for. |
| Background job | n/a | The job's saved data | Jobs re-check that the tenant is on, and that any staff action is still allowed, when they run |

The Assistant may act for any customer phone in a tenant. That's acceptable because WhatsApp has already proved the customer owns that phone. The assistant key is therefore as sensitive as a database password.

The user, tenant and role lookup is cached for a few minutes per token, so a removed staff member loses access within minutes (`SIG-04`).

## Staff limited to some venues

Inside a tenant, a Manager or Front Desk can be limited to some venues (`SIG-06`, [ADR 0011](../adr/0011-staff-limited-to-venues.md)). It works like the tenant rules, one level down:

1. `resolveCaller` puts the list on the caller as `venueIds`. Owners, Platform Admins, customers and the public have no list, which means every venue.
2. Every repository function for venue data takes `venueIds` right after its other ids and adds it to the `WHERE`. It is a required argument, so a new call can't forget it; pass `undefined` only where no caller is involved (jobs).
3. Data that hangs off a resource (Price Rules, bookings) checks the resource's venue with a subquery.
4. Something at another venue replies 404, the same as a missing row.
5. Every module whose tables point at a venue or resource has a `*.venue-scope.test.ts` (architecture rule 13).

Customers are tenant-wide: they can book at any venue, and any staff member can find them.

## Queries across tenants

A few questions are about a person, not a tenant: "which tenants is this user staff at?" for `/v1/me` (`SIG-02`). Their repository function has no `tenantId` and its name ends in `AcrossTenants` (`staff.repository.ts: findRolesAcrossTenants`), so it stands out in review. Such a function only ever filters by the signed-in user's own id.
