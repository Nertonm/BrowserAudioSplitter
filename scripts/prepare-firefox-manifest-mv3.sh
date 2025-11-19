#!/usr/bin/env bash
set -euo pipefail
# prepare-firefox-manifest-mv3.sh
# Copies manifest-firefox-mv3.json to manifest.json (backs up existing manifest.json if present)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f manifest-firefox-mv3.json ]; then
  echo "manifest-firefox-mv3.json not found in $ROOT_DIR"
  exit 1
fi

if [ -f manifest.json ]; then
  cp manifest.json manifest.json.backup || true
  echo "Existing manifest.json backed up to manifest.json.backup"
fi

cp manifest-firefox-mv3.json manifest.json
echo "Copied manifest-firefox-mv3.json -> manifest.json"
echo "Now open Firefox about:debugging -> This Firefox -> Load Temporary Add-on and select the new manifest.json file in this directory."
