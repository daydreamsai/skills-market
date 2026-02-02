#!/bin/bash
#
# Tests for check-plugin-versions.sh
# Creates temporary git repos to test various scenarios
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_CHECK="$SCRIPT_DIR/check-plugin-versions.sh"
TEST_DIR=$(mktemp -d)
PASSED=0
FAILED=0

# Cleanup on exit
cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() {
    echo -e "${GREEN}PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}FAIL${NC}: $1"
    echo "  Expected: $2"
    echo "  Got: $3"
    FAILED=$((FAILED + 1))
}

log_test() {
    echo -e "\n${YELLOW}TEST${NC}: $1"
}

# Setup a test git repo
setup_repo() {
    local repo_dir="$TEST_DIR/$1"
    mkdir -p "$repo_dir"
    cd "$repo_dir"
    git init -q
    git config user.email "test@test.com"
    git config user.name "Test"
}

# Create a plugin structure
create_plugin() {
    local name="$1"
    local version="${2:-1.0.0}"

    mkdir -p "plugins/$name/.claude-plugin"
    mkdir -p "plugins/$name/skills"

    cat > "plugins/$name/.claude-plugin/plugin.json" << EOF
{
  "name": "$name",
  "version": "$version",
  "description": "Test plugin $name"
}
EOF

    cat > "plugins/$name/skills/SKILL.md" << EOF
---
name: $name
description: Test skill
---
# $name
EOF
}

# Create marketplace.json
create_marketplace() {
    local version="$1"
    shift
    local plugins=("$@")

    mkdir -p ".claude-plugin"

    echo '{' > .claude-plugin/marketplace.json
    echo '  "name": "test-marketplace",' >> .claude-plugin/marketplace.json
    echo '  "owner": { "name": "Test" },' >> .claude-plugin/marketplace.json
    echo '  "metadata": { "version": "'"$version"'" },' >> .claude-plugin/marketplace.json
    echo '  "plugins": [' >> .claude-plugin/marketplace.json

    local first=true
    for plugin in "${plugins[@]}"; do
        IFS=':' read -r name ver <<< "$plugin"
        if [ "$first" = true ]; then
            first=false
        else
            echo ',' >> .claude-plugin/marketplace.json
        fi
        cat >> .claude-plugin/marketplace.json << EOF
    {
      "name": "$name",
      "source": "./plugins/$name",
      "version": "$ver"
    }
EOF
    done

    echo '  ]' >> .claude-plugin/marketplace.json
    echo '}' >> .claude-plugin/marketplace.json
}

# ============================================
# TEST 1: All plugins listed, no changes
# ============================================
log_test "All plugins listed, no file changes"

setup_repo "test1"
create_plugin "plugin-a" "1.0.0"
create_plugin "plugin-b" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0" "plugin-b:1.0.0"
git add -A && git commit -q -m "Initial"

OUTPUT=$("$VERSION_CHECK" HEAD HEAD 2>&1)

if echo "$OUTPUT" | grep -q "All plugins.*are listed in marketplace.json"; then
    log_pass "Detects all plugins are in marketplace"
else
    log_fail "Should detect all plugins in marketplace" "All plugins listed message" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "No plugin files changed"; then
    log_pass "Detects no file changes"
else
    log_fail "Should detect no file changes" "No plugin files changed" "$OUTPUT"
fi

# ============================================
# TEST 2: Plugin missing from marketplace
# ============================================
log_test "Plugin missing from marketplace.json"

setup_repo "test2"
create_plugin "plugin-a" "1.0.0"
create_plugin "plugin-b" "1.0.0"
create_plugin "plugin-c" "1.0.0"  # This one won't be in marketplace
create_marketplace "1.0.0" "plugin-a:1.0.0" "plugin-b:1.0.0"
git add -A && git commit -q -m "Initial"

OUTPUT=$("$VERSION_CHECK" HEAD HEAD 2>&1)

if echo "$OUTPUT" | grep -q "plugin-c.*Missing from marketplace.json"; then
    log_pass "Detects plugin-c missing from marketplace"
else
    log_fail "Should detect plugin-c missing" "plugin-c Missing from marketplace.json" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "plugin-c missing from marketplace.json"; then
    log_pass "Reports error for missing plugin"
else
    log_fail "Should report error" "Error message for missing plugin" "$OUTPUT"
fi

# ============================================
# TEST 3: Version bumped correctly
# ============================================
log_test "Version bumped when files change"

setup_repo "test3"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Make changes and bump version
echo "# Updated content" >> plugins/plugin-a/skills/SKILL.md
create_marketplace "1.0.0" "plugin-a:1.0.1"
git add -A && git commit -q -m "Update plugin-a"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "plugin-a.*1.0.0.*1.0.1.*Bumped"; then
    log_pass "Detects version bump from 1.0.0 to 1.0.1"
else
    log_fail "Should detect version bump" "1.0.0 -> 1.0.1 Bumped" "$OUTPUT"
fi

# ============================================
# TEST 4: Version NOT bumped (warning)
# ============================================
log_test "Warning when version not bumped"

setup_repo "test4"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Make changes but DON'T bump version
echo "# Updated content" >> plugins/plugin-a/skills/SKILL.md
git add -A && git commit -q -m "Update without version bump"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "plugin-a.*Version unchanged"; then
    log_pass "Detects unchanged version"
else
    log_fail "Should detect unchanged version" "Version unchanged warning" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "Warnings"; then
    log_pass "Reports as warning"
else
    log_fail "Should report warning" "Warnings section" "$OUTPUT"
fi

# ============================================
# TEST 5: Marketplace version check
# ============================================
log_test "Marketplace metadata.version check"

setup_repo "test5"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Change marketplace content but don't bump metadata.version
create_marketplace "1.0.0" "plugin-a:1.0.1"  # plugin version bumped, but not marketplace
git add -A && git commit -q -m "Update marketplace"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "marketplace.json changed but.*metadata.version.*unchanged"; then
    log_pass "Detects marketplace version unchanged"
else
    log_fail "Should detect marketplace version unchanged" "metadata.version unchanged warning" "$OUTPUT"
fi

# ============================================
# TEST 6: Marketplace version bumped
# ============================================
log_test "Marketplace version bumped correctly"

setup_repo "test6"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Bump marketplace version
create_marketplace "1.1.0" "plugin-a:1.0.1"
git add -A && git commit -q -m "Update marketplace with version bump"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "marketplace.json version bumped.*1.0.0.*1.1.0"; then
    log_pass "Detects marketplace version bump"
else
    log_fail "Should detect marketplace version bump" "1.0.0 -> 1.1.0" "$OUTPUT"
fi

# ============================================
# TEST 7: Multiple plugins changed
# ============================================
log_test "Multiple plugins with mixed status"

setup_repo "test7"
create_plugin "plugin-a" "1.0.0"
create_plugin "plugin-b" "1.0.0"
create_plugin "plugin-c" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0" "plugin-b:1.0.0" "plugin-c:1.0.0"
git add -A && git commit -q -m "Initial"

# plugin-a: version bumped
echo "# Update" >> plugins/plugin-a/skills/SKILL.md
# plugin-b: no version bump
echo "# Update" >> plugins/plugin-b/skills/SKILL.md
# plugin-c: no changes

create_marketplace "1.0.0" "plugin-a:1.0.1" "plugin-b:1.0.0" "plugin-c:1.0.0"
git add -A && git commit -q -m "Mixed updates"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "plugin-a.*Bumped"; then
    log_pass "Detects plugin-a bumped"
else
    log_fail "Should detect plugin-a bumped" "Bumped status" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "plugin-b.*Version unchanged"; then
    log_pass "Detects plugin-b unchanged"
else
    log_fail "Should detect plugin-b unchanged" "Version unchanged status" "$OUTPUT"
fi

# plugin-c should not appear (no changes)
if ! echo "$OUTPUT" | grep -q "plugin-c.*1.0.0.*1.0.0"; then
    log_pass "Does not report plugin-c (no changes)"
else
    log_fail "Should not report plugin-c" "No entry for unchanged plugin" "$OUTPUT"
fi

# ============================================
# TEST 8: Plugin added without marketplace version bump
# ============================================
log_test "Plugin added without marketplace version bump (should warn)"

setup_repo "test8"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Add new plugin but DON'T bump marketplace version
create_plugin "plugin-new" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0" "plugin-new:1.0.0"
git add -A && git commit -q -m "Add new plugin without version bump"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "Plugin Count Change"; then
    log_pass "Detects plugin count change"
else
    log_fail "Should detect plugin count change" "Plugin Count Change section" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -qi "plugin.*added.*metadata.version.*unchanged"; then
    log_pass "Warns about unchanged marketplace version on plugin add"
else
    log_fail "Should warn about unchanged marketplace version" "Warning about metadata.version unchanged" "$OUTPUT"
fi

# ============================================
# TEST 9: Plugin added with marketplace version bump
# ============================================
log_test "Plugin added with marketplace version bump (should pass)"

setup_repo "test9"
create_plugin "plugin-a" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Initial"

# Add new plugin AND bump marketplace version
create_plugin "plugin-new" "1.0.0"
create_marketplace "1.1.0" "plugin-a:1.0.0" "plugin-new:1.0.0"
git add -A && git commit -q -m "Add new plugin with version bump"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -q "Marketplace version bumped.*1.0.0.*1.1.0"; then
    log_pass "Detects marketplace version bump on plugin add"
else
    log_fail "Should detect marketplace version bump" "Marketplace version bumped message" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "1.*2"; then
    log_pass "Shows plugin count change (1 → 2)"
else
    log_fail "Should show plugin count" "Plugin count 1 → 2" "$OUTPUT"
fi

# ============================================
# TEST 10: Plugin removed without marketplace version bump
# ============================================
log_test "Plugin removed without marketplace version bump (should warn)"

setup_repo "test10"
create_plugin "plugin-a" "1.0.0"
create_plugin "plugin-b" "1.0.0"
create_marketplace "1.0.0" "plugin-a:1.0.0" "plugin-b:1.0.0"
git add -A && git commit -q -m "Initial"

# Remove plugin-b from marketplace but DON'T bump version
rm -rf plugins/plugin-b
create_marketplace "1.0.0" "plugin-a:1.0.0"
git add -A && git commit -q -m "Remove plugin without version bump"

OUTPUT=$("$VERSION_CHECK" HEAD~1 HEAD 2>&1)

if echo "$OUTPUT" | grep -qi "plugin.*removed.*metadata.version.*unchanged"; then
    log_pass "Warns about unchanged marketplace version on plugin removal"
else
    log_fail "Should warn about unchanged marketplace version" "Warning about metadata.version unchanged" "$OUTPUT"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "============================================"

if [ $FAILED -gt 0 ]; then
    exit 1
fi
