# Future Iteration Context

This file captures the debugging context that produced `0.0.13`.

## Stable Design

The stable approach is:

1. Detect that VS Code was opened on a standalone file with no workspace folders.
2. Compute the requested root from `openFileParentFolder.rootMode`.
3. For `/`, write a generated workspace file at:

   ```text
   ~/Library/Application Support/Code/User/globalStorage/local.open-file-parent-folder/filesystem-root.code-workspace
   ```

4. Launch VS Code once with the generated workspace and the target file:

   ```text
   code --reuse-window --disable-layout-restore --skip-welcome --skip-sessions-welcome <workspace> <file>
   ```

5. Once the workspace is active, reveal the file in Explorer, open Markdown files with `vscode.markdown.preview.editor`, close duplicate text tabs, and close chat/panel UI.

This matters because previous versions that opened `/` first and then issued a delayed detached `code --reuse-window <file.md>` were able to leave VS Code in a bad multi-instance state. That presented as "another instance of Code is running" and also looked like Typora instability when the default Markdown handler was being changed during testing.

## Things To Preserve

- Keep root-mode opening as a single CLI invocation with workspace and file together.
- Keep the generated `/` workspace file rather than opening `/` directly.
- Keep generated-workspace Git suppression:
  - `git.enabled: false`
  - `git.autoRepositoryDetection: false`
  - `git.openRepositoryInParentFolders: never`
- Keep broad root-level watcher/search excludes for root mode.
- Keep Markdown opening through `vscode.openWith` and close duplicate Markdown text tabs after preview opens.
- Keep stale pending-state cleanup for old versions.
- Keep the debug log path stable:

  ```text
  ~/Library/Application Support/Code/User/globalStorage/local.open-file-parent-folder/debug.log
  ```

## Known Tradeoffs

- `filesystemRoot` gives the desired macOS filesystem traversal, but VS Code workspace trust can restrict Markdown preview behavior at `/`. Today the working local setup disables Workspace Trust globally.
- `home` and `parent` root modes are safer alternatives for systems where disabling Workspace Trust is not acceptable.
- Root Explorer traversal can still be expensive on unusual machines or mounted volumes. The generated workspace and user settings both exclude common heavy folders.
- The extension assumes the VS Code CLI lives in the standard macOS app bundle paths if `code` is not available.

## UI Cleanup Commands

The extension currently attempts these commands when `openFileParentFolder.closeAuxiliaryUi` is `true`:

- `workbench.action.closeAuxiliaryBar`
- `workbench.action.closePanel`
- `workbench.action.chat.close`
- `workbench.action.chat.closeChat`
- `workbench.panel.chat.view.copilot.close`
- `workbench.view.chat.close`

Keep these best-effort and command-existence checked; command names vary across VS Code and extension versions.

## Useful Future Improvements

- Add a setup script that safely merges the recommended settings into VS Code user settings after taking a timestamped backup.
- Add a smoke-test script for macOS that opens a temporary `.md` file, checks `code --status`, inspects the debug log, and reports likely failure modes.
- Make root workspace excludes configurable.
- Add a command to show the generated workspace path and debug log path.
- Consider signing or attaching VSIX files to GitHub releases if this becomes more than a personal alpha project.
- Revisit the Workspace Trust tradeoff if VS Code exposes a narrower way to trust only the generated filesystem-root workspace.
