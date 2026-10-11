#!/bin/sh
# .githooks/setup.sh
# Installs the project's native Git hooks by pointing git's hooksPath at
# the .githooks/ directory.  Runs automatically on `npm install` (root
# package.json "prepare" script) - there is no separate manual step.
#
# Re-run without reinstalling (e.g. after `npm ci --ignore-scripts`):
#   npm run prepare

HOOK_NAME=setup
# shellcheck source=.githooks/_common.sh
. "$(dirname "$0")/_common.sh"

# ── Verify we are inside a git repository ─────────────────────────────────────
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  print_error "Not a git repository. Please run this script from the project root."
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO_ROOT/.githooks"

if [ ! -d "$HOOKS_DIR" ]; then
  print_error ".githooks/ directory not found at $HOOKS_DIR"
  exit 1
fi

# ── Make hook scripts executable ─────────────────────────────────────────────
print_info "Making hook scripts executable…"
chmod +x "$HOOKS_DIR/pre-commit"  2>/dev/null && print_success "  pre-commit  ✓"
chmod +x "$HOOKS_DIR/commit-msg"  2>/dev/null && print_success "  commit-msg  ✓"
chmod +x "$HOOKS_DIR/pre-push"    2>/dev/null && print_success "  pre-push    ✓"

# ── Configure git to use .githooks/ ──────────────────────────────────────────
# Clear first: a plain set fails if core.hooksPath already has multiple values.
print_info "Configuring git hooksPath → .githooks"
git config --local --unset-all core.hooksPath 2>/dev/null
git config --local core.hooksPath .githooks

if [ $? -eq 0 ]; then
  print_success "Git hooks installed successfully."
  print_info "  pre-commit: Biome check per directory, schema tests"
  print_info "  commit-msg: Conventional Commits format check (use 'npx czg' to compose)"
  print_info "  pre-push:   unit tests + schema validation"
  print_info ""
  print_info "To skip a hook temporarily:"
  print_info "  git commit --no-verify"
  print_info "  git push   --no-verify"
else
  print_error "Failed to configure git hooksPath."
  exit 1
fi

# ── Optional: verify czg is available ────────────────────────────────────────
if command -v czg >/dev/null 2>&1; then
  print_success "czg found: standardized commit messages are enabled."
  print_info "  Use 'czg' (or 'npx czg') instead of 'git commit -m …' for guided messages."
  print_info "  Use 'czg --ai' to generate an AI-assisted commit message."
else
  print_warning "czg not found globally. Install it with: npm install -g czg"
  print_info "  You can still use 'npx czg' or 'npx czg --ai' without a global install."
fi
