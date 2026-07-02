#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="$(node -p "require('./package.json').version")"
mkdir -p dist
npx --yes @vscode/vsce package --out "dist/open-file-parent-folder-${version}.vsix"

echo "Wrote dist/open-file-parent-folder-${version}.vsix"
