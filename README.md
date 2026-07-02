# VS Code Open File Parent Folder

Private personal VS Code extension for the macOS "open this file" workflow.

When VS Code is opened from Finder or LaunchServices on a standalone file, this extension reopens the window on a useful workspace root, reveals the file in Explorer, and can close the auxiliary/chat UI. With the settings below, `.md` files open as rendered Markdown previews while the Explorer is rooted at the macOS filesystem root.

Status: personal private build. Current version: `0.0.13`. This is not published to the VS Code Marketplace.

## Quick Install

From a clone of this private repo:

```bash
scripts/install.sh
```

Or install the checked-in VSIX directly if the `code` command is on `PATH`:

```bash
code --install-extension dist/open-file-parent-folder-0.0.13.vsix --force
```

If the `code` command is not on `PATH`, `scripts/install.sh` checks the standard macOS VS Code app locations.

## Required VS Code Settings

Add or merge these settings into VS Code user settings:

```json
{
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.untrustedFiles": "open",
  "workbench.startupEditor": "none",
  "workbench.secondarySideBar.defaultVisibility": "hidden",
  "workbench.editorAssociations": {
    "*.md": "vscode.markdown.preview.editor"
  },
  "explorer.autoReveal": true,
  "openFileParentFolder.rootMode": "filesystemRoot",
  "openFileParentFolder.closeAuxiliaryUi": true,
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/System/**": true,
    "**/Applications/**": true,
    "**/private/**": true,
    "**/Volumes/**": true,
    "**/Network/**": true,
    "**/.Trash/**": true
  },
  "search.exclude": {
    "**/node_modules/**": true,
    "**/System/**": true,
    "**/Applications/**": true,
    "**/private/**": true,
    "**/Volumes/**": true,
    "**/Network/**": true,
    "**/.Trash/**": true
  }
}
```

`security.workspace.trust.enabled: false` is a real security tradeoff. It was needed for this workflow because opening `/` as the workspace otherwise leaves VS Code restricted enough that Markdown preview behavior can fail. If that is not acceptable on another Mac, use `openFileParentFolder.rootMode: "home"` or `"parent"` instead.

## Expected Behavior

For a Markdown file opened from Finder or `open /path/to/file.md`:

- VS Code opens one normal window.
- Explorer is visible and rooted at `filesystem-root (Workspace)` when `rootMode` is `filesystemRoot`.
- The target Markdown file is selected in Explorer.
- The editor tab is the rendered Markdown preview, not the raw text editor.
- Chat, panel, and auxiliary side bar are closed after the window settles.

## Development

Package a new VSIX:

```bash
scripts/package.sh
```

Install the current repo build:

```bash
scripts/install.sh
```

Useful local diagnostics:

```bash
code --list-extensions --show-versions | grep open-file-parent-folder
code --status
tail -n 80 "$HOME/Library/Application Support/Code/User/globalStorage/local.open-file-parent-folder/debug.log"
```

If `code` is not on `PATH`, use `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code` for those diagnostics.

## Documentation

- [Install details](docs/INSTALL.md)
- [Future iteration context](docs/FUTURE_ITERATION_CONTEXT.md)
- [Changelog](CHANGELOG.md)
