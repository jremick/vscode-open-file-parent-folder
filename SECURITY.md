# Security Policy

## Supported versions

Security fixes are considered for the latest code on `main` and the currently checked-in VSIX. Older builds are not supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue for a suspected vulnerability or include sensitive local paths, logs, or credentials in an issue.

Include the affected version, reproduction steps, impact, and any suggested mitigation. Reports and response times are handled on a best-effort basis because this is a personal public-alpha project.

## Security-sensitive configuration

The documented `filesystemRoot` workflow can require disabling VS Code Workspace Trust globally and opening the macOS filesystem root as a workspace. That is a significant security tradeoff. Prefer `home` or `parent` root mode when disabling Workspace Trust is not acceptable.
