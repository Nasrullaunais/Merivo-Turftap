# T43 Production deployment

Status: todo · Stories: none · Depends on: none (needed before Auth0 and WhatsApp can reach the API) · Decision: **D-14** · Go-live waits on buying the domain

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
