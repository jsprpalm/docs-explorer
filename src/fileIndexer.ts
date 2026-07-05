import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import ignore from 'ignore';
import { FileEntry } from './model';
import { DocsConfig } from './config';

export interface WorkspaceIndex {
  folder: vscode.WorkspaceFolder;
  files: FileEntry[];
}

/** Index every workspace folder into a flat list of markdown (or configured) files. */
export async function indexWorkspace(config: DocsConfig): Promise<WorkspaceIndex[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const results: WorkspaceIndex[] = [];
  for (const folder of folders) {
    results.push({ folder, files: await indexFolder(folder, config) });
  }
  return results;
}

async function indexFolder(
  folder: vscode.WorkspaceFolder,
  config: DocsConfig,
): Promise<FileEntry[]> {
  const include = new vscode.RelativePattern(folder, config.include);
  const excludeGlob = buildExcludeGlob(config);
  const uris = await vscode.workspace.findFiles(include, excludeGlob);

  let entries: FileEntry[] = await Promise.all(
    uris.map(async (uri) => ({
      fsPath: uri.fsPath,
      relativePath: toPosixRelative(folder, uri),
      mtime: await statMtime(uri.fsPath),
    })),
  );

  if (config.respectGitignore) {
    entries = await applyGitignore(folder, entries);
  }
  return entries;
}

/**
 * `workspace.findFiles` does not honor `.gitignore`, and passing a non-null
 * `exclude` string suppresses the default `files.exclude`. So we merge the
 * extension's own exclude with `files.exclude`/`search.exclude` into one glob.
 */
function buildExcludeGlob(config: DocsConfig): string | undefined {
  const patterns = new Set<string>();
  if (config.exclude) {
    patterns.add(config.exclude);
  }
  for (const key of ['files.exclude', 'search.exclude']) {
    const val = vscode.workspace.getConfiguration().get<Record<string, boolean>>(key) ?? {};
    for (const [glob, enabled] of Object.entries(val)) {
      if (enabled) {
        patterns.add(glob);
      }
    }
  }
  const arr = [...patterns];
  if (arr.length === 0) {
    return undefined;
  }
  return arr.length === 1 ? arr[0] : `{${arr.join(',')}}`;
}

async function applyGitignore(
  folder: vscode.WorkspaceFolder,
  entries: FileEntry[],
): Promise<FileEntry[]> {
  const gitignoreUri = vscode.Uri.joinPath(folder.uri, '.gitignore');
  let content: string;
  try {
    const bytes = await vscode.workspace.fs.readFile(gitignoreUri);
    content = Buffer.from(bytes).toString('utf8');
  } catch {
    return entries; // no .gitignore at the root
  }
  const ig = ignore().add(content);
  return entries.filter((e) => !ig.ignores(e.relativePath));
}

function toPosixRelative(folder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
  const rel = path.relative(folder.uri.fsPath, uri.fsPath);
  return rel.split(path.sep).join('/');
}

async function statMtime(fsPath: string): Promise<number> {
  try {
    return (await fs.promises.stat(fsPath)).mtimeMs;
  } catch {
    return 0;
  }
}
