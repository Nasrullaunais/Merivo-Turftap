# Built from the repo root: docker build -f apps/api/Dockerfile .
FROM oven/bun:1.4.5-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/portal/package.json apps/portal/
COPY apps/console/package.json apps/console/
COPY packages/contract/package.json packages/contract/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile --production --filter '@turftap/api'

FROM oven/bun:1.4.5-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app ./
COPY packages/contract packages/contract
COPY apps/api apps/api
WORKDIR /app/apps/api
USER bun
EXPOSE 3000
CMD ["bun", "src/main.ts"]
