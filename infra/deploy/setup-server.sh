#!/usr/bin/env bash
# Prepares a fresh Ubuntu server for TurfTap. Safe to run again.
# Usage: sudo bash setup-server.sh "<GitHub deploy public key>" <base domain>
set -euo pipefail

deploy_key="${1:?usage: setup-server.sh '<deploy public key>' <base domain>}"
base_domain="${2:?usage: setup-server.sh '<deploy public key>' <base domain>}"
SWAP_SIZE=2G
APP_DIR=/opt/turftap
export DEBIAN_FRONTEND=noninteractive

step() { printf '\n==> %s\n' "$*"; }

step "System updates"
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl ufw unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' \
  > /etc/apt/apt.conf.d/20auto-upgrades

step "Docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
# shellcheck source=/dev/null
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

step "Swap, so a busy moment can't run out of memory"
if [[ ! -f /swapfile ]]; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon --all

step "Firewall: SSH, HTTP and HTTPS only"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

step "SSH: keys only"
cat > /etc/ssh/sshd_config.d/10-turftap.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sshd -t
systemctl reload ssh

step "deploy user, used by GitHub Actions"
id deploy &> /dev/null || useradd --create-home --shell /bin/bash --groups docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$deploy_key" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

step "App folder and settings"
install -d -m 750 -o deploy -g deploy "$APP_DIR"
if [[ ! -f "$APP_DIR/.env" ]]; then
  postgres_password="$(openssl rand -hex 32)"
  cat > "$APP_DIR/.env" <<EOF
SITE_MODE=hidden
BASE_DOMAIN=$base_domain
CLOUDFLARE_API_TOKEN=
POSTGRES_PASSWORD=$postgres_password
DATABASE_URL=postgres://turftap:$postgres_password@postgres:5432/turftap
NODE_ENV=development
LOG_LEVEL=info
CONSOLE_URL=https://console.$base_domain
CORS_ORIGINS=https://console.$base_domain
ASSISTANT_API_KEY=$(openssl rand -hex 32)
EOF
  chown deploy:deploy "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Wrote $APP_DIR/.env with new secrets. Copy it into a password manager."
fi

step "Done"
docker --version
docker compose version
