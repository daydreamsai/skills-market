#!/usr/bin/env bash
set -euo pipefail

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

bool() {
  if "$@"; then
    echo "true"
  else
    echo "false"
  fi
}

claude_installed="$(bool has_cmd claude)"
codex_installed="$(bool has_cmd codex)"
railway_installed="$(bool has_cmd railway)"
git_installed="$(bool has_cmd git)"
bun_installed="$(bool has_cmd bun)"

railway_auth="false"
railway_auth_source="none"

if [ -n "${RAILWAY_TOKEN:-}" ]; then
  railway_auth="true"
  railway_auth_source="env"
elif [ "$railway_installed" = "true" ] && railway whoami >/dev/null 2>&1; then
  railway_auth="true"
  railway_auth_source="cli"
fi

provider="none"
if [ "$claude_installed" = "true" ]; then
  provider="claude"
fi
if [ "$codex_installed" = "true" ]; then
  if [ "$provider" = "none" ]; then
    provider="codex"
  else
    provider="both"
  fi
fi

cat <<OUT
CLAUDE_INSTALLED=$claude_installed
CODEX_INSTALLED=$codex_installed
RAILWAY_INSTALLED=$railway_installed
GIT_INSTALLED=$git_installed
BUN_INSTALLED=$bun_installed
RAILWAY_AUTH=$railway_auth
RAILWAY_AUTH_SOURCE=$railway_auth_source
PROVIDER=$provider
OUT
