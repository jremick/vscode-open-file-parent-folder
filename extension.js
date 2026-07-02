const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const fsSync = require("fs");
const childProcess = require("child_process");
const vscode = require("vscode");

const pendingFileKey = "openFileParentFolder.pendingFile";
const pendingFileName = "pending-file.json";
let launchInProgress = false;
let lastAutoPreviewFilePath = undefined;

function activate(context) {
  log(context, "activated");

  const runSoon = (delayMs = 250) => {
    setTimeout(() => {
      openParentFolderIfNeeded(context).catch((error) => {
        log(context, "failed", error);
      });
    }, delayMs);
  };

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => runSoon()));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => runSoon()));
  context.subscriptions.push(vscode.window.tabGroups.onDidChangeTabs(() => runSoon()));

  runSoon(500);
  runSoon(1500);
  runSoon(3000);
  runSoon(6000);
  runSoon(10000);
}

async function openParentFolderIfNeeded(context) {
  const config = vscode.workspace.getConfiguration("openFileParentFolder");
  if (!config.get("enabled", true)) {
    log(context, "disabled");
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  const pendingFile = await readPendingFile(context);

  log(context, "tick", {
    workspaceFolders: workspaceFolders.map((folder) => folder.uri.fsPath),
    pendingFile,
    activeFile: getActiveFileUri() && getActiveFileUri().fsPath
  });

  if (pendingFile) {
    const activeFilePath = getActiveFileUri() && getActiveFileUri().fsPath;
    if (workspaceFolders.length === 0 && activeFilePath && activeFilePath !== pendingFile) {
      log(context, "clearing stale pending file", { pendingFile, activeFilePath });
      await clearPendingFile(context);
      return openParentFolderIfNeeded(context);
    }

    if (workspaceFolders.length === 0) {
      log(context, "waiting for workspace before opening pending file", { pendingFile });
      return;
    }

    await closeAuxiliaryUiIfConfigured();
    await revealFileInExplorer(pendingFile);
    lastAutoPreviewFilePath = pendingFile;
    const didReopen = await reopenPendingFile(pendingFile);
    await revealFileInExplorer(pendingFile);
    await closeAuxiliaryUiIfConfigured();
    await scheduleUiCleanup();

    if (didReopen) {
      await clearPendingFile(context);
    }

    return;
  }

  const fileUri = getActiveFileUri();

  if (!fileUri || fileUri.scheme !== "file") {
    log(context, "no active file uri");
    return;
  }

  const filePath = fileUri.fsPath;

  if (workspaceFolders.length > 0) {
    if (isMarkdownFile(filePath) && lastAutoPreviewFilePath !== filePath) {
      log(context, "workspace markdown preview", { filePath });
      lastAutoPreviewFilePath = filePath;
      await revealFileInExplorer(filePath);
      await openMarkdownPreview(filePath);
      await revealFileInExplorer(filePath);
      await closeAuxiliaryUiIfConfigured();
      await scheduleUiCleanup();
    }

    return;
  }

  const folderPath = getWorkspaceRoot(filePath, config);

  if (!folderPath || folderPath === filePath) {
    log(context, "no usable folder path", { filePath, folderPath });
    return;
  }

  if (launchInProgress) {
    log(context, "workspace launch already in progress", { folderPath, filePath });
    return;
  }

  log(context, "opening workspace root", { folderPath, filePath });
  await clearPendingFile(context);
  await openWorkspaceWithCli(context, folderPath, filePath);
}

async function openWorkspaceWithCli(context, folderPath, filePath) {
  if (launchInProgress) {
    return;
  }

  launchInProgress = true;
  await closeAuxiliaryUiIfConfigured();

  const codeCliPath = getCodeCliPath();
  if (!codeCliPath) {
    await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folderPath), {
      forceNewWindow: false
    });
    return;
  }

  const workspacePath = await getWorkspacePathForRoot(context, folderPath);
  const child = childProcess.spawn(codeCliPath, [
    "--reuse-window",
    "--disable-layout-restore",
    "--skip-welcome",
    "--skip-sessions-welcome",
    workspacePath,
    filePath
  ], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

async function getWorkspacePathForRoot(context, folderPath) {
  if (folderPath !== path.parse(folderPath).root) {
    return folderPath;
  }

  const workspacePath = path.join(context.globalStorageUri.fsPath, "filesystem-root.code-workspace");
  const workspace = {
    folders: [{ path: folderPath }],
    settings: {
      "git.enabled": false,
      "git.autoRepositoryDetection": false,
      "git.openRepositoryInParentFolders": "never",
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
  };

  await fs.mkdir(context.globalStorageUri.fsPath, { recursive: true });
  await fs.writeFile(workspacePath, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
  return workspacePath;
}

function log(context, message, data) {
  const line = `${new Date().toISOString()} ${message}${data === undefined ? "" : ` ${serializeLogData(data)}`}\n`;
  console.log(`open-file-parent-folder ${message}`, data);

  fs.mkdir(context.globalStorageUri.fsPath, { recursive: true })
    .then(() => fs.appendFile(path.join(context.globalStorageUri.fsPath, "debug.log"), line, "utf8"))
    .catch(() => {});
}

function serializeLogData(data) {
  if (data instanceof Error) {
    return JSON.stringify({
      name: data.name,
      message: data.message,
      stack: data.stack
    });
  }

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function getCodeCliPath() {
  const candidates = [
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
    "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code"
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function readPendingFile(context) {
  const fromDisk = await readPendingFileFromDisk(context);
  if (fromDisk) {
    return fromDisk;
  }

  const legacyPendingFile = context.globalState.get(pendingFileKey);
  if (legacyPendingFile) {
    log(context, "clearing legacy pending global state", { legacyPendingFile });
    await context.globalState.update(pendingFileKey, undefined);
  }

  return undefined;
}

async function readPendingFileFromDisk(context) {
  try {
    const state = JSON.parse(await fs.readFile(getPendingFilePath(context), "utf8"));
    if (typeof state.filePath === "string" && state.filePath) {
      return state.filePath;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("open-file-parent-folder failed reading pending file", error);
    }
  }

  return undefined;
}

async function writePendingFile(context, filePath) {
  await fs.mkdir(context.globalStorageUri.fsPath, { recursive: true });
  await fs.writeFile(getPendingFilePath(context), JSON.stringify({ filePath }), "utf8");
}

async function clearPendingFile(context) {
  await context.globalState.update(pendingFileKey, undefined);
  try {
    await fs.unlink(getPendingFilePath(context));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("open-file-parent-folder failed clearing pending file", error);
    }
  }
}

function getPendingFilePath(context) {
  return path.join(context.globalStorageUri.fsPath, pendingFileName);
}

function getWorkspaceRoot(filePath, config) {
  const mode = config.get("rootMode", "parent");

  if (mode === "filesystemRoot") {
    return path.parse(filePath).root;
  }

  if (mode === "home") {
    return os.homedir();
  }

  return path.dirname(filePath);
}

function getActiveFileUri() {
  const editor = vscode.window.activeTextEditor;
  if (editor && !editor.document.isUntitled) {
    return editor.document.uri;
  }

  const activeTabUri = getUriFromTab(vscode.window.tabGroups.activeTabGroup.activeTab);
  if (activeTabUri) {
    return activeTabUri;
  }

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const uri = getUriFromTab(tab);
      if (uri) {
        return uri;
      }
    }
  }

  for (const document of vscode.workspace.textDocuments) {
    if (!document.isUntitled && document.uri.scheme === "file") {
      return document.uri;
    }
  }

  return undefined;
}

function getUriFromTab(tab) {
  const input = tab && tab.input;

  if (!input) {
    return undefined;
  }

  if (input.uri) {
    return input.uri;
  }

  if (input.modified) {
    return input.modified;
  }

  if (input.original) {
    return input.original;
  }

  return undefined;
}

async function reopenPendingFile(filePath) {
  const uri = vscode.Uri.file(filePath);

  if (isMarkdownFile(filePath)) {
    const didOpenPreview = await openMarkdownPreview(filePath);
    scheduleMarkdownPreview(filePath);
    return didOpenPreview;
  }

  await vscode.commands.executeCommand("vscode.open", uri, {
    preview: false
  });
  return true;
}

function isMarkdownFile(filePath) {
  return path.extname(filePath).toLowerCase() === ".md";
}

async function openMarkdownPreview(filePath) {
  const uri = vscode.Uri.file(filePath);

  try {
    let didOpenPreview = false;

    try {
      await vscode.commands.executeCommand("vscode.openWith", uri, "vscode.markdown.preview.editor", vscode.ViewColumn.Active);
      didOpenPreview = true;
    } catch (error) {
      console.error("open-file-parent-folder failed opening markdown preview editor", error);
    }

    if (!didOpenPreview) {
      const didRunPreviewCommand = await runCommandIfAvailable("markdown.showPreview", uri);
      if (!didRunPreviewCommand) {
        return false;
      }
    }

    await delay(500);
    await closeDuplicateMarkdownTextTabs(uri);
    return true;
  } catch (error) {
    console.error("open-file-parent-folder failed opening markdown preview", error);
    return false;
  }
}

function scheduleMarkdownPreview(filePath) {
  for (const delayMs of [500, 1500, 3000]) {
    setTimeout(() => {
      openMarkdownPreview(filePath).catch((error) => {
        console.error("open-file-parent-folder failed delayed markdown preview", error);
      });
    }, delayMs);
  }
}

function isMarkdownPreviewTabOpen(uri) {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      const tabUri = getUriFromTab(tab);

      if (!tabUri || tabUri.scheme !== "file" || tabUri.fsPath !== uri.fsPath) {
        continue;
      }

      if (isMarkdownPreviewInput(input)) {
        return true;
      }
    }
  }

  return false;
}

function isActiveMarkdownPreview() {
  const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
  return isMarkdownPreviewInput(activeTab && activeTab.input);
}

function isMarkdownPreviewInput(input) {
  const viewType = input && input.viewType;
  return viewType === "markdown.preview" || viewType === "vscode.markdown.preview.editor";
}

async function closeDuplicateMarkdownTextTabs(uri) {
  const tabsToClose = [];

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      const tabUri = getUriFromTab(tab);

      if (!tabUri || tabUri.scheme !== "file" || tabUri.fsPath !== uri.fsPath) {
        continue;
      }

      if (isMarkdownPreviewInput(input)) {
        continue;
      }

      tabsToClose.push(tab);
    }
  }

  if (tabsToClose.length > 0) {
    await vscode.window.tabGroups.close(tabsToClose, true);
  }
}

async function closeAuxiliaryUiIfConfigured() {
  const config = vscode.workspace.getConfiguration("openFileParentFolder");
  if (!config.get("closeAuxiliaryUi", true)) {
    return;
  }

  await runCommandIfAvailable("workbench.action.closeAuxiliaryBar");
  await runCommandIfAvailable("workbench.action.closePanel");
  await runCommandIfAvailable("workbench.action.chat.close");
  await runCommandIfAvailable("workbench.action.chat.closeChat");
  await runCommandIfAvailable("workbench.panel.chat.view.copilot.close");
  await runCommandIfAvailable("workbench.view.chat.close");
}

async function scheduleUiCleanup() {
  for (const delayMs of [250, 750, 1500, 3000, 6000]) {
    setTimeout(() => {
      closeAuxiliaryUiIfConfigured().catch((error) => {
        console.error("open-file-parent-folder failed delayed UI cleanup", error);
      });
    }, delayMs);
  }
}

async function revealFileInExplorer(filePath) {
  const uri = vscode.Uri.file(filePath);

  await vscode.commands.executeCommand("workbench.view.explorer");

  const didReveal = await runCommandIfAvailable("revealInExplorer", uri);
  if (!didReveal) {
    await runCommandIfAvailable("workbench.files.action.showActiveFileInExplorer");
  }
}

function delay(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function runCommandIfAvailable(command, ...args) {
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes(command)) {
    return false;
  }

  await vscode.commands.executeCommand(command, ...args);
  return true;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
