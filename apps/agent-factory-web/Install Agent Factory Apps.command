#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
"$script_dir/scripts/create-macos-apps.sh"
open "$script_dir"
