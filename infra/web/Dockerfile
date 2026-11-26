# Built from the repo root: docker build -f infra/web/Dockerfile .
FROM oven/bun:1.4.5-alpine AS frontends
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --filter '@turftap/portal' --filter '@turftap/console'
RUN cd apps/portal && bunx vite build && cd ../console && bunx vite build

FROM caddy:2.11.9-builder-alpine AS caddy
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2.11.9-alpine
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY infra/web/*.Caddyfile /etc/caddy/
COPY infra/web/coming-soon /srv/coming-soon
COPY --from=frontends /app/apps/portal/dist /srv/portal
COPY --from=frontends /app/apps/console/dist /srv/console
RUN for mode in hidden live; do \
      BASE_DOMAIN=example.com CLOUDFLARE_API_TOKEN=validate-only-not-a-real-token-000000000 \
      caddy validate --adapter caddyfile --config /etc/caddy/$mode.Caddyfile || exit 1; \
    done
