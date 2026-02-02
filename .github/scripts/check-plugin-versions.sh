#!/bin/bash
#
# Plugin Version Check Script
# Compares plugin versions between base branch and PR branch
# Reports: missing plugins in marketplace, version mismatches, unchanged versions
#

set -euo pipefail

BASE_REF="${1:-origin/main}"
HEAD_REF="${2:-HEAD}"

# Colors for local testing (stripped in CI)
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track issues
declare -a ERRORS=()
declare -a WARNINGS=()
declare -a OK=()

# Get list of plugins from filesystem
get_filesystem_plugins() {
    local ref="$1"
    git ls-tree -d --name-only "$ref" plugins/ 2>/dev/null | sed 's|plugins/||' | sort
}

# Get list of plugins from marketplace.json
get_marketplace_plugins() {
    local ref="$1"
    git show "$ref:.claude-plugin/marketplace.json" 2>/dev/null | \
        grep -o '"name": "[^"]*"' | \
        sed 's/"name": "//g' | sed 's/"//g' | sort
}

# Get version from marketplace.json for a plugin
get_marketplace_version() {
    local ref="$1"
    local plugin="$2"
    git show "$ref:.claude-plugin/marketplace.json" 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data.get('plugins', []):
    if p.get('name') == '$plugin':
        print(p.get('version', 'unset'))
        sys.exit(0)
print('not-in-marketplace')
" 2>/dev/null || echo "not-in-marketplace"
}

# Get version from plugin.json
get_plugin_json_version() {
    local ref="$1"
    local plugin="$2"
    git show "$ref:plugins/$plugin/.claude-plugin/plugin.json" 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('version', 'unset'))
" 2>/dev/null || echo "no-plugin-json"
}

# Get changed plugin directories
get_changed_plugins() {
    git diff --name-only "$BASE_REF" "$HEAD_REF" -- plugins/ | \
        cut -d'/' -f2 | sort -u
}

# Get plugin count from marketplace.json
get_marketplace_plugin_count() {
    local ref="$1"
    git show "$ref:.claude-plugin/marketplace.json" 2>/dev/null | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('plugins',[])))" 2>/dev/null || echo "0"
}

# Get marketplace metadata version
get_marketplace_meta_version() {
    local ref="$1"
    git show "$ref:.claude-plugin/marketplace.json" 2>/dev/null | \
        python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('metadata',{}).get('version','unset'))" 2>/dev/null || echo "unset"
}

# Check if marketplace.json changed
marketplace_changed() {
    git diff --name-only "$BASE_REF" "$HEAD_REF" -- .claude-plugin/marketplace.json | grep -q marketplace.json
}

echo "## Plugin Version Check"
echo ""
echo "_Comparing \`$BASE_REF\` → \`$HEAD_REF\`_"
echo ""

# 1. Check for plugins missing from marketplace
echo "### Marketplace Coverage"
echo ""

FS_PLUGINS=$(get_filesystem_plugins "$HEAD_REF")
MP_PLUGINS=$(get_marketplace_plugins "$HEAD_REF")

MISSING_FROM_MARKETPLACE=()
for plugin in $FS_PLUGINS; do
    if ! echo "$MP_PLUGINS" | grep -q "^${plugin}$"; then
        MISSING_FROM_MARKETPLACE+=("$plugin")
    fi
done

if [ ${#MISSING_FROM_MARKETPLACE[@]} -gt 0 ]; then
    echo "| Plugin | Status |"
    echo "|--------|--------|"
    for plugin in "${MISSING_FROM_MARKETPLACE[@]}"; do
        echo "| \`$plugin\` | :x: Missing from marketplace.json |"
        ERRORS+=("$plugin missing from marketplace.json")
    done
    echo ""
else
    echo ":white_check_mark: All plugins in \`plugins/\` are listed in marketplace.json"
    echo ""
fi

# 1b. Check if plugins were added/removed from marketplace
BASE_PLUGIN_COUNT=$(get_marketplace_plugin_count "$BASE_REF")
HEAD_PLUGIN_COUNT=$(get_marketplace_plugin_count "$HEAD_REF")

if [ "$BASE_PLUGIN_COUNT" != "$HEAD_PLUGIN_COUNT" ]; then
    echo "### Plugin Count Change"
    echo ""

    BASE_MP_META=$(get_marketplace_meta_version "$BASE_REF")
    HEAD_MP_META=$(get_marketplace_meta_version "$HEAD_REF")

    DIFF=$((HEAD_PLUGIN_COUNT - BASE_PLUGIN_COUNT))
    if [ $DIFF -gt 0 ]; then
        ACTION="added"
        COUNT=$DIFF
    else
        ACTION="removed"
        COUNT=$((-DIFF))
    fi

    echo "Plugins $ACTION: **$COUNT** ($BASE_PLUGIN_COUNT → $HEAD_PLUGIN_COUNT)"
    echo ""

    if [ "$BASE_MP_META" == "$HEAD_MP_META" ]; then
        echo ":warning: Plugin(s) $ACTION but \`metadata.version\` unchanged ($HEAD_MP_META)"
        WARNINGS+=("marketplace.json: $COUNT plugin(s) $ACTION but metadata.version still $HEAD_MP_META")
    else
        echo ":white_check_mark: Marketplace version bumped: $BASE_MP_META → $HEAD_MP_META"
        OK+=("marketplace.json: $BASE_MP_META → $HEAD_MP_META (plugin count: $BASE_PLUGIN_COUNT → $HEAD_PLUGIN_COUNT)")
    fi
    echo ""
fi

# 2. Check changed plugins for version bumps
CHANGED_PLUGINS=$(get_changed_plugins)

if [ -z "$CHANGED_PLUGINS" ]; then
    echo "### Changed Plugins"
    echo ""
    echo "_No plugin files changed in this PR._"
    echo ""
else
    echo "### Changed Plugins"
    echo ""
    echo "| Plugin | Files Changed | Base Version | PR Version | Status |"
    echo "|--------|---------------|--------------|------------|--------|"

    for plugin in $CHANGED_PLUGINS; do
        # Count changed files
        FILE_COUNT=$(git diff --name-only "$BASE_REF" "$HEAD_REF" -- "plugins/$plugin" | wc -l | tr -d ' ')

        # Get versions
        BASE_MP_VER=$(get_marketplace_version "$BASE_REF" "$plugin")
        HEAD_MP_VER=$(get_marketplace_version "$HEAD_REF" "$plugin")
        BASE_PJ_VER=$(get_plugin_json_version "$BASE_REF" "$plugin")
        HEAD_PJ_VER=$(get_plugin_json_version "$HEAD_REF" "$plugin")

        # Determine display version (prefer marketplace)
        if [ "$HEAD_MP_VER" != "not-in-marketplace" ]; then
            BASE_VER="$BASE_MP_VER"
            HEAD_VER="$HEAD_MP_VER"
        else
            BASE_VER="$BASE_PJ_VER"
            HEAD_VER="$HEAD_PJ_VER"
        fi

        # Determine status
        if [ "$HEAD_MP_VER" == "not-in-marketplace" ]; then
            STATUS=":x: Not in marketplace"
            ERRORS+=("$plugin: not in marketplace.json")
        elif [ "$BASE_VER" == "$HEAD_VER" ]; then
            STATUS=":warning: Version unchanged"
            WARNINGS+=("$plugin: $FILE_COUNT file(s) changed but version still $HEAD_VER")
        else
            STATUS=":white_check_mark: Bumped"
            OK+=("$plugin: $BASE_VER → $HEAD_VER")
        fi

        echo "| \`$plugin\` | $FILE_COUNT | $BASE_VER | $HEAD_VER | $STATUS |"
    done
    echo ""
fi

# 3. Check marketplace.json version if it changed (and we didn't already report on plugin count)
if marketplace_changed && [ "$BASE_PLUGIN_COUNT" == "$HEAD_PLUGIN_COUNT" ]; then
    echo "### Marketplace Version"
    echo ""

    BASE_MP_META=$(get_marketplace_meta_version "$BASE_REF")
    HEAD_MP_META=$(get_marketplace_meta_version "$HEAD_REF")

    if [ "$BASE_MP_META" == "$HEAD_MP_META" ]; then
        echo ":warning: marketplace.json changed but \`metadata.version\` unchanged ($HEAD_MP_META)"
        WARNINGS+=("marketplace.json: content changed but metadata.version still $HEAD_MP_META")
    else
        echo ":white_check_mark: marketplace.json version bumped: $BASE_MP_META → $HEAD_MP_META"
        OK+=("marketplace.json: $BASE_MP_META → $HEAD_MP_META")
    fi
    echo ""
fi

# 4. Summary
echo "### Summary"
echo ""

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "**:x: Errors (${#ERRORS[@]})**"
    for err in "${ERRORS[@]}"; do
        echo "- $err"
    done
    echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "**:warning: Warnings (${#WARNINGS[@]})**"
    for warn in "${WARNINGS[@]}"; do
        echo "- $warn"
    done
    echo ""
    echo "_Unchanged versions may be intentional for docs-only changes. Please confirm before merging._"
    echo ""
fi

if [ ${#OK[@]} -gt 0 ]; then
    echo "**:white_check_mark: Version bumps (${#OK[@]})**"
    for ok in "${OK[@]}"; do
        echo "- $ok"
    done
    echo ""
fi

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
    echo ":tada: All checks passed!"
fi
