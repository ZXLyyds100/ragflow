#!/usr/bin/env bash
set -euo pipefail
: "${RAGFLOW_REPO:?Set RAGFLOW_REPO to the existing RAGFlow checkout}"
Here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export RAGFLOW_REPO
cd "$Here"
exec "$RAGFLOW_REPO/web/node_modules/.bin/vite" \
  --config "$Here/vite.config.mjs" --configLoader runner --host 127.0.0.1 --port 4173 --strictPort
