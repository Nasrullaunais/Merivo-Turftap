# Frontend

Two React apps share one setup, copied from GenexoAI's gen-ui v2:

| App | For | Address |
|---|---|---|
| `apps/portal` | Customers. Phone-first, light, mostly public pages. | `<tenant>.turftap.lk` |
| `apps/console` | Staff and Platform Admins. Calendars, tables, queues. | `console.turftap.lk` |

**Stack:** React 19, Vite, TanStack Router (file routes), TanStack Query, HeroUI v3, Tailwind 4, Vitest + Testing Library, Playwright + axe for a few end-to-end journeys.

## Folder layout (same in both apps)

```
src/
├── routes/        # TanStack file routes, only layout and wiring
├── features/      # one folder per area: bookings, calendar, receipts, members, venues, settings
├── components/    # shared inside this app
├── layout/        # shell, sidebar, top bar, mobile nav
├── lib/           # api, auth, tenant, forms, format
├── config/        # nav items, route permissions, brand
├── i18n/          # text catalogs: i18n/en/<area>.ts
└── test/          # test helpers
```

Code shared by **both** apps goes in `packages/ui` (theme, components, `ApiError` and `createQueryClient`) or `packages/contract` (API types and generated client).

## Rules (checked by `src/architecture.test.ts`)

- A feature never imports another feature. Shared code moves to `components/`, `lib/` or `packages/ui`.
- `lib/` imports nothing from `features/`, `layout/`, `routes/` or `components/`.
- `components/` imports nothing from `features/`.
- No circular imports.
- Only `lib/auth` imports `oidc-client-ts`. Only `lib/api` imports the client instance (`@turftap/contract/client/client`) to set the tenant header and turn failures into `ApiError`. Features use the generated query helpers (`@turftap/contract/client/react-query`).
- Hooks live in `useX.ts` files. Contexts live in `*-context.ts` files. Component files export only components.
- App code never imports from `test/`.
- The two apps never import each other.

## Data and errors

- All server data goes through TanStack Query hooks in `features/<area>/`, built from the generated helpers: `useQuery({ ...listVenuesOptions(), select: (reply) => reply.data.content })`. Components never call `fetch` directly.
- A failed request shows a toast from one place (`createQueryClient` in `packages/ui`), with the `traceId` as a reference. A page that shows the error itself passes `meta: { silent: true }`. Requests that failed with a 4xx are not retried.
- A 401 is handled once: `createQueryClient({ onUnauthorized })` in the app's `router.ts` signs out through `lib/auth` and goes back to sign-in.
- Tokens and the chosen tenant are kept in `sessionStorage`.
- The portal sends `X-Tenant-Slug` from its web address (`?tenant=demo` locally); the console sends `X-Tenant-Id` for the chosen tenant, except on `/v1/me`, which is about the person.

## Sign-in in the console

- Until the Auth0 tenant exists, `/sign-in` is a test form: it stores `fake:<phone>` as the token, which the API accepts only with `AUTH_PROVIDER=fake`.
- After sign-in, `/v1/me` decides where the user goes (`SIG-02`): one tenant opens straight away, several go to `/choose-tenant`, none go to `/no-access`. A Platform Admin with no tenant still opens the console.
- Switching tenant drops all cached data, because cached replies belong to the old tenant.
- Menu items, search and route guards all read one permission list: `config/routePermissions.ts`.

## Text and look

- Every piece of text lives in `i18n/en/<area>.ts`. Sinhala and Tamil are added later as `si` and `ta` with `satisfies Catalog<typeof en>`, so a missing key fails the type check.
- Sentences built from pieces are one catalog function, so other languages can reorder words.
- Dates, times and money use the shared formatters in `lib/format` and the venue's time zone.
- Neutral backgrounds plus one accent colour. Booking states always show colour **and** an icon: waiting for payment, waiting for check, confirmed, blocked.
- WCAG AA contrast (4.5:1). The end-to-end tests run axe to check it.
- Pages over about 300 lines are split: a hook owns the data and state, and small components own each section.
