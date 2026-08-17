# Changelog

## Unreleased

- Prepared the repository for public-alpha use with Apache-2.0 licensing, public-facing documentation, and a private security reporting path.

## 0.0.13

- Opens filesystem-root mode through a generated `.code-workspace` file instead of opening `/` directly.
- Invokes VS Code once with both the workspace and target file to avoid delayed detached reopen loops.
- Opens Markdown files with the rendered preview editor and closes duplicate raw-text Markdown tabs.
- Reveals the target file in Explorer after the workspace settles.
- Closes chat, panel, and auxiliary UI on a best-effort basis.
- Suppresses Git discovery in the generated root workspace.
- Clears stale pending state left by older local builds.
