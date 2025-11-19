#!/usr/bin/env bash
set -euo pipefail
# restore-manifest.sh
# Restores manifest.json from manifest.json.backup if present; otherwise removes manifest.json

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f manifest.json.backup ]; then
  mv -f manifest.json.backup manifest.json
  echo "Restored manifest.json from manifest.json.backup"
else
  if [ -f manifest.json ]; then
    rm manifest.json
    echo "Removed manifest.json (no backup found)"
  else
    echo "No manifest.json to restore or remove"
  fi
fi
