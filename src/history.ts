import * as vscode from 'vscode';
import { FileNode } from './model';
import { Commit, getFileAtCommit, getFileHistory } from './git';

/** Virtual scheme backing the left-hand side of a historical diff. */
export const GIT_SCHEME = 'docs-explorer-git';

interface GitShowRef {
  sha: string;
  cwd: string;
  rel: string;
}

/** Serves `git show <sha>:<file>` as a read-only virtual document. */
class GitShowContentProvider implements vscode.TextDocumentContentProvider {
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const { sha, cwd, rel } = JSON.parse(uri.query) as GitShowRef;
    try {
      return await getFileAtCommit(cwd, sha, rel);
    } catch (err) {
      return `Could not load ${rel} at ${sha}\n\n${String(err)}`;
    }
  }
}

function gitShowUri(fsPath: string, ref: GitShowRef): vscode.Uri {
  // Keep the real path so the diff gets a title + markdown syntax highlighting.
  return vscode.Uri.from({ scheme: GIT_SCHEME, path: fsPath, query: JSON.stringify(ref) });
}

export function registerHistory(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(GIT_SCHEME, new GitShowContentProvider()),
    vscode.commands.registerCommand('docsExplorer.showTimeline', (node: FileNode) =>
      // The built-in Timeline command points the Timeline view at this resource.
      vscode.commands.executeCommand('files.openTimeline', vscode.Uri.file(node.fsPath)),
    ),
    vscode.commands.registerCommand('docsExplorer.showHistory', (node: FileNode) =>
      showHistory(node),
    ),
  );
}

async function showHistory(node: FileNode): Promise<void> {
  const uri = vscode.Uri.file(node.fsPath);
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    void vscode.window.showWarningMessage('Docs Explorer: file is not in an open workspace folder.');
    return;
  }
  const cwd = folder.uri.fsPath;
  const rel = node.relativePath;

  let commits: Commit[];
  try {
    commits = await getFileHistory(cwd, rel);
  } catch (err) {
    void vscode.window.showErrorMessage(`Docs Explorer: git log failed. ${String(err)}`);
    return;
  }
  if (commits.length === 0) {
    void vscode.window.showInformationMessage(`No git history for ${rel}.`);
    return;
  }

  const picked = await vscode.window.showQuickPick(
    commits.map((c) => ({
      label: c.subject || '(no commit message)',
      description: `${c.shortSha} · ${c.date}`,
      detail: c.author,
      commit: c,
    })),
    {
      placeHolder: `History of ${node.label} — pick a commit to diff against the working tree`,
      matchOnDescription: true,
    },
  );
  if (!picked) {
    return;
  }

  const left = gitShowUri(node.fsPath, { sha: picked.commit.sha, cwd, rel });
  const title = `${node.label} (${picked.commit.shortSha}) ↔ Working Tree`;
  await vscode.commands.executeCommand('vscode.diff', left, uri, title);
}
