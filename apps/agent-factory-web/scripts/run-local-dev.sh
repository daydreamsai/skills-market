#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd "$script_dir/.." && pwd)"

cd "$app_dir"

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev
