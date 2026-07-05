import * as vscode from 'vscode';
import { FileNode } from './model';
import { DocsConfig } from './config';
import { ViewMode } from './docsTreeProvider';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);

function isMarkdown(fsPath: string): boolean {
  const dot = fsPath.lastIndexOf('.');
  return dot >= 0 && MARKDOWN_EXTENSIONS.has(fsPath.slice(dot).toLowerCase());
}

export interface CommandDeps {
  getConfig: () => DocsConfig;
  reindex: () => void | Promise<void>;
  setMode: (mode: ViewMode) => void | Promise<void>;
}

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const openFile = async (node: FileNode): Promise<void> => {
    const uri = vscode.Uri.file(node.fsPath);
    const cfg = deps.getConfig();

    // Non-markdown files (e.g. when `include` is extended to .txt) have no
    // preview, so always open them in the editor.
    if (!isMarkdown(node.fsPath) || cfg.defaultOpenMode === 'edit') {
      await vscode.commands.executeCommand('vscode.open', uri, { preview: !cfg.openInNewTab });
      return;
    }
    if (cfg.defaultOpenMode === 'preview') {
      await vscode.commands.executeCommand('markdown.showPreview', uri);
    } else {
      await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('docsExplorer.openFile', openFile),
    vscode.commands.registerCommand('docsExplorer.openInEditor', (node: FileNode) =>
      vscode.commands.executeCommand('vscode.open', vscode.Uri.file(node.fsPath), {
        preview: false,
      }),
    ),
    vscode.commands.registerCommand('docsExplorer.openPreviewFull', (node: FileNode) =>
      vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(node.fsPath)),
    ),
    vscode.commands.registerCommand('docsExplorer.revealInExplorer', (node: FileNode) =>
      vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(node.fsPath)),
    ),
    vscode.commands.registerCommand('docsExplorer.copyRelativePath', (node: FileNode) =>
      vscode.env.clipboard.writeText(node.relativePath),
    ),
    vscode.commands.registerCommand('docsExplorer.refresh', () => deps.reindex()),
    vscode.commands.registerCommand('docsExplorer.viewAsFlat', () => deps.setMode('flat')),
    vscode.commands.registerCommand('docsExplorer.viewAsTree', () => deps.setMode('tree')),
  );
}
