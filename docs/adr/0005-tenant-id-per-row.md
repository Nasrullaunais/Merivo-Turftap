# Tenants share tables, separated by a tenant id on every row

Every tenant-owned table has a `tenant_id` column, and every repository function takes the tenant id as its first argument. We first planned one Postgres schema per tenant, which gives stronger isolation, but it needs a migration runner that loops over every schema and makes cross-tenant reports hard. For an early-stage product we chose the simpler setup.

## Consequences

- The tenant always comes from the signed-in user, never from the URL or request body.
- Tests sign in as tenant A and try to read, list and change tenant B's data.
- Reads check ownership inside the SQL (`WHERE id = $1 AND tenant_id = $2`), so another tenant's row returns 404.
- No Postgres Row Level Security in v1, to keep setup simple. An architecture test checks that every repository function takes the tenant id first. RLS can be added later without changing data.
