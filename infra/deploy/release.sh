#!/usr/bin/env bash
# Releases one version on the server: back up, migrate, start, check, or go back.
# Usage, from /opt/turftap: ./release.sh v1.2.3
set -euo pipefail

BACKUPS_KEPT=10
WAIT_SECONDS=120

version="${1:?usage: release.sh vX.Y.Z}"
cd "$(dirname "$0")"
previous="$(cat .version 2>/dev/null || true)"

step() { printf '\n==> %s\n' "$*"; }
compose() { TURFTAP_VERSION="$version" docker compose "$@"; }

step "Pulling $version"
compose pull api migrate web

step "Starting the database"
compose up -d --wait postgres

step "Backing up the database"
mkdir -p backups
backup="backups/turftap-$(date -u +%Y%m%dT%H%M%SZ)-before-$version.dump"
compose exec -T postgres pg_dump -U turftap -Fc turftap > "$backup"
ls -1t backups/*.dump | tail -n +$((BACKUPS_KEPT + 1)) | xargs -r rm --
echo "Saved $backup"

step "Migrating"
compose run --rm migrate

step "Starting $version"
if compose up -d --wait --wait-timeout "$WAIT_SECONDS" api web; then
  echo "$version" > .version
  docker image prune -f > /dev/null
  step "$version is live"
  exit 0
fi

compose logs --tail 50 api web || true
if [[ -n "$previous" && "$previous" != "$version" ]]; then
  step "$version failed its health check; going back to $previous"
  TURFTAP_VERSION="$previous" docker compose up -d --wait --wait-timeout "$WAIT_SECONDS" api web
fi
exit 1
