# T02 Customer and Assistant callers on the API

Status: todo · Stories: `POR-03`, `AST-05` · Depends on: T01

## Goal
Two new kinds of caller can reach the API: a signed-in customer from the Customer Portal, and the Assistant acting for a customer. They only ever see their own rows.

## Read first
- `docs/architecture/tenancy.md` ("How each caller's tenant is found").
- `docs/architecture/api.md` (`forCustomers`).
- `apps/api/src/modules/platform/platform.service.ts` (`resolveCaller`; today a token plus `X-Tenant-Slug` throws `customerSignInNotBuilt`).
- `apps/api/src/lib/resource/define-resource.ts` (how `forCustomers` is checked).

## Build
- **Customer:** `Bearer` token + `X-Tenant-Slug` → `actor: "customer"`, `userId`, `tenantId`, and `customerId` when a `customers` row with the user's phone exists. Tenant must exist and be on.
- **Assistant:** a new secret `ASSISTANT_API_KEY` in config and `.env.example`. Header `Authorization: Assistant <key>` + `X-Tenant-Id` + `X-Customer-Phone` → `actor: "assistant"`, `customerId` looked up by phone. Tenant must be on. Compare the key in constant time.
- `customers` resource: `forCustomers: ["list", "get", "create"]`. A customer or Assistant can only create a record for their own phone (`POR-03`, `AST-05`: name given once) and only list or get their own. A second create for the same phone replies "already exists".
- Cache the caller the same way staff callers are cached.

## Not in this ticket
Portal screens (T29). The `whatsapp-numbers` lookup the Assistant makes before it knows the tenant (T03).

## Done when
- Route tests: a customer sees only their own record; another phone's record is 404; a customer from tenant A can't read tenant B; a wrong assistant key is 401; a tenant that is off refuses both callers.
- `docs/architecture/tenancy.md` names the assistant header format.
- `bun run check` passes.
