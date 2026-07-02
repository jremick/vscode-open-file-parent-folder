#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('${repo_root}/package.json').version")"
vsix_path="${1:-${repo_root}/dist/open-file-parent-folder-${version}.vsix}"

if [[ ! -f "$vsix_path" ]]; then
  echo "VSIX not found: $vsix_path" >&2
  echo "Run scripts/package.sh first, or pass a VSIX path as the first argument." >&2
  exit 1
fi

if command -v code >/dev/null 2>&1; then
  code_bin="$(command -v code)"
elif [[ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
  code_bin="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
elif [[ -x "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code" ]]; then
  code_bin="/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code"
else
  echo "Could not find the VS Code CLI. Install the 'code' shell command or install VS Code in /Applications." >&2
  exit 1
fi

"$code_bin" --install-extension "$vsix_path" --force

echo "Installed $vsix_path"
