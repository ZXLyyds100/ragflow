#!/usr/bin/env bash
set -euo pipefail
Here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="${PLAYWRIGHT_CLI_SCRIPT:-${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh}"
ReviewEnv="${RAGFLOW_REVIEW_ENV:-$Here/../../state/with-ragflow-review-env.sh}"
cd "$Here"
# Relative path is intentional: macOS UNIX sockets have a short path limit.
export PWTEST_SOCKETS_DIR=.pw-sockets
export npm_config_offline=true
exec bash "$ReviewEnv" bash "$CLI" --session ragflow21113-ui "$@"
