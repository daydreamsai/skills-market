#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd "$script_dir/.." && pwd)"
launcher_app="$app_dir/Agent Factory.app"
stop_app="$app_dir/Agent Factory Stop.app"
tmp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

if ! command -v osacompile >/dev/null 2>&1; then
  echo "osacompile is required but was not found." >&2
  exit 1
fi

launcher_script="$tmp_dir/launcher.applescript"
cat >"$launcher_script" <<'APPLESCRIPT'
on run
  set appPath to POSIX path of (path to me)
  set appDir to do shell script "/usr/bin/dirname " & quoted form of appPath
  do shell script "/bin/bash " & quoted form of (appDir & "/scripts/start-app.sh")
end run
APPLESCRIPT

stop_script="$tmp_dir/stop.applescript"
cat >"$stop_script" <<'APPLESCRIPT'
on run
  set appPath to POSIX path of (path to me)
  set appDir to do shell script "/usr/bin/dirname " & quoted form of appPath
  do shell script "/bin/bash " & quoted form of (appDir & "/scripts/stop-app.sh")
end run
APPLESCRIPT

rm -rf "$launcher_app" "$stop_app"
osacompile -o "$launcher_app" "$launcher_script" >/dev/null
osacompile -o "$stop_app" "$stop_script" >/dev/null

echo "Created:"
echo "  $launcher_app"
echo "  $stop_app"
