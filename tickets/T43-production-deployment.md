# T43 Production deployment

Status: doing (pipeline done; go-live waits on the domain and T40–T42) · Stories: none · Depends on: none (needed before Auth0 and WhatsApp can reach the API) · Decision: **D-14** · Go-live waits on buying the domain

## Goal
The app runs on the OVH VPS with HTTPS for every address, and a release is: tag → images built → back up → migrate → start → `/health/ready`.

## Read first
- `docs/architecture/deployment.md` (whole page), `compose.yaml`, `.github/workflows/check.yml`.

## Build
- The domain isn't bought yet (D-14). Make it one setting (`BASE_DOMAIN`), and test with the server's IP or a temporary name. When it's bought, its DNS goes on Cloudflare and Caddy uses the Cloudflare DNS plugin.
- Dockerfiles for `api` and a static build for `portal` and `console`.
- `compose.prod.yaml`: Caddy (built with the Cloudflare DNS plugin for the wildcard `*.<domain>` certificate), api, postgres (named volume), n8n behind basic auth. Only Caddy is open to the internet.
- CI: on a `vX.Y.Z` tag, build and push images.
- A release script or written steps for the server, including migrations as their own step.
- Fake adapters refused in production (already in config; check it).

## Done when
- The site answers on HTTPS at the real addresses, `/health/ready` is green, and a second release with a migration works.

## Built so far
- Tag `vX.Y.Z` on `main` → check → `api` and `web` images in GHCR → `release.sh` on the server (back up, migrate, start, check, go back on failure). See `docs/architecture/deployment.md#releases`.
- The server runs `SITE_MODE=hidden` on `167-114-120-81.sslip.io`: every address shows "coming soon" and the API runs with fakes, unreachable from the internet.
- n8n is left out until T35.

## Left for go-live
- Buy the domain, DNS on Cloudflare, then follow `docs/architecture/deployment.md#going-live`. The `live` Caddy setup was tested on `localhost` but not yet with a Cloudflare certificate.
- Needs the real adapters first (T40, T41, T42, R2), because `NODE_ENV=production` refuses fakes.
