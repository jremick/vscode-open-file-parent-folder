# Install Details

This repo is intended for personal private installs on macOS systems where VS Code is the Markdown file handler.

## Prerequisites

- VS Code stable or Insiders installed in `/Applications`.
- The VS Code `code` CLI on `PATH`, or the standard app bundle path available.
- GitHub access to this private repository.
- User-level VS Code settings access.

## Install From VSIX

```bash
git clone https://github.com/jremick/vscode-open-file-parent-folder.git
cd vscode-open-file-parent-folder
scripts/install.sh
```

Manual equivalent if `code` is on `PATH`:

```bash
code --install-extension dist/open-file-parent-folder-0.0.13.vsix --force
```

When `code` is not on `PATH`, use:

```bash
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension dist/open-file-parent-folder-0.0.13.vsix --force
```

## Build And Install From Source

```bash
git clone https://github.com/jremick/vscode-open-file-parent-folder.git
cd vscode-open-file-parent-folder
scripts/package.sh
scripts/install.sh
```

`scripts/package.sh` uses `npx --yes @vscode/vsce package` and writes the output to `dist/open-file-parent-folder-<version>.vsix`.

## Configure VS Code

Open VS Code user settings JSON:

```bash
code "$HOME/Library/Application Support/Code/User/settings.json"
```

If `code` is not on `PATH`, open that file through VS Code itself or use the app-bundle CLI path shown above.

Merge in the settings from the root README. The most important settings are:

- `workbench.editorAssociations` maps `*.md` to `vscode.markdown.preview.editor`.
- `openFileParentFolder.rootMode` is set to `filesystemRoot`.
- `openFileParentFolder.closeAuxiliaryUi` is set to `true`.
- `security.workspace.trust.enabled` is set to `false` if using `filesystemRoot`.
- `files.watcherExclude` and `search.exclude` avoid heavy root-level folders.

## Set Markdown To Open With VS Code

If Markdown files are not opening in VS Code from Finder, set the default handler in Finder with `Get Info > Open with > Visual Studio Code > Change All`.

To inspect the current LaunchServices mapping:

```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -dump | grep -A5 "net.daringfireball.markdown"
```

## Verify

Create or choose a Markdown file, then quit VS Code and open it through macOS:

```bash
osascript -e 'tell application "Visual Studio Code" to quit' 2>/dev/null || true
open /path/to/file.md
```

Expected result:

- One VS Code window opens.
- Explorer shows the filesystem root workspace.
- The opened `.md` file is revealed in Explorer.
- The editor displays rendered Markdown preview.
- The AI chat/auxiliary pane does not remain open.

If any of those fail, check:

```bash
code --status
tail -n 120 "$HOME/Library/Application Support/Code/User/globalStorage/local.open-file-parent-folder/debug.log"
```
