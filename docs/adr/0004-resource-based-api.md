# The API is resource-based, with five routes per resource

Every resource gets exactly the same routes: list, get one, create, update (PATCH) and delete, registered by one helper. URLs are flat (`/v1/resources?venueId=3`, not `/v1/venues/3/resources`). We deliberately avoid the action routes and nested sub-collections GenexoAI grew over time (`/cancel`, `/approve`, `/{id}/items` and about 30 more), because they made the API hard to learn and inconsistent.

## Consequences

- Status changes (cancel, confirm, verify) are a PATCH of `status`. Each resource declares which status changes are allowed and who may make them; the server rejects the rest.
- Read-only computed data is also a resource, for example `GET /v1/availability`.
- Each list allows only the filters it declares. We don't copy GenexoAI's generic filter language: it took weeks to build and caused tenant-leak bugs.
- Every reply uses one envelope: `{ status, message, data }`, with `code` and `traceId` added on errors.
- Vendor callbacks (Auth0 sending a login code, Meta delivery updates, a future payment provider) are the only exception. They live under `/hooks/<vendor>`, are checked by a shared secret, and may only call adapters and services.
