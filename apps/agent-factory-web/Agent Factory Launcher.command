#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
"$script_dir/scripts/create-macos-apps.sh" >/dev/null 2>&1 || true
"$script_dir/scripts/start-app.sh"
