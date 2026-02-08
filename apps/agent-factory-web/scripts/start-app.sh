#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd "$script_dir/.." && pwd)"
runtime_dir="$app_dir/.runtime"
log_file="$runtime_dir/server.log"
port="${PORT:-8890}"
uid="$(id -u)"
label="build.agentfactory.web"
launch_agents_dir="$HOME/Library/LaunchAgents"
plist_file="$launch_agents_dir/$label.plist"
node_bin="$(command -v node || true)"
npm_bin="$(command -v npm || true)"
launch_path="${PATH:-}"

append_path() {
  local candidate="$1"
  if [ -z "$candidate" ]; then
    return
  fi
  if [ ! -d "$candidate" ]; then
    return
  fi
  case ":$launch_path:" in
    *":$candidate:"*) ;;
    *) launch_path="${launch_path:+$launch_path:}$candidate" ;;
  esac
}

is_healthy() {
  curl -fsS "http://127.0.0.1:$port/api/health" >/dev/null 2>&1
}

mkdir -p "$runtime_dir"
mkdir -p "$launch_agents_dir"

if [ -z "$node_bin" ]; then
  echo "Node.js is not installed. Install Node first." >&2
  exit 1
fi

if [ -z "$npm_bin" ]; then
  echo "npm is not installed. Install Node/npm first." >&2
  exit 1
fi

for candidate in \
  "/opt/homebrew/bin" \
  "/usr/local/bin" \
  "/usr/bin" \
  "/bin" \
  "/usr/sbin" \
  "/sbin" \
  "$HOME/.bun/bin" \
  "$HOME/.local/bin" \
  "$HOME/.npm-global/bin"
do
  append_path "$candidate"
done

npm_prefix="$("$npm_bin" config get prefix 2>/dev/null || true)"
if [ -n "$npm_prefix" ] && [ "$npm_prefix" != "undefined" ]; then
  append_path "$npm_prefix/bin"
fi

if is_healthy && [ -f "$plist_file" ] && grep -q "<key>PATH</key>" "$plist_file"; then
  open "http://127.0.0.1:$port"
  exit 0
fi

cd "$app_dir"

if [ ! -d node_modules ]; then
  npm install
fi

npm run build

cat >"$plist_file" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$node_bin</string>
    <string>$app_dir/server/index.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>$port</string>
    <key>PATH</key>
    <string>$launch_path</string>
  </dict>
  <key>WorkingDirectory</key>
  <string>$app_dir</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$log_file</string>
  <key>StandardErrorPath</key>
  <string>$log_file</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$uid/$label" >/dev/null 2>&1 || true
launchctl bootout "gui/$uid" "$plist_file" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$uid" "$plist_file"
launchctl kickstart -k "gui/$uid/$label" >/dev/null 2>&1 || true

ready="false"
for _ in $(seq 1 60); do
  if is_healthy; then
    ready="true"
    break
  fi
  sleep 0.25
done

if [ "$ready" != "true" ]; then
  echo "Server failed to start on port $port. Check log: $log_file" >&2
  launchctl print "gui/$uid/$label" >/dev/null 2>&1 || true
  exit 1
fi

open "http://127.0.0.1:$port"
