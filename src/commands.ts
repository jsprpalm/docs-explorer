import * as vscode from 'vscode';
import { FileNode } from './model';
import { DocsConfig } from './config';
import { ViewMode } from './docsTreeProvider';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);

// Built-in custom editor that renders the markdown preview inside a normal
// editor slot (the one `workbench.editorAssociations` targets). Because it is
// an editor — not a standalone webview panel — it participates in VS Code's
// transient/"preview tab" system, so opening it with `preview: true` reuses and
// replaces the tab on the next click instead of spawning a new panel.
const MARKDOWN_PREVIEW_EDITOR = 'vscode.markdown.preview.editor';

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
    // `preview: true` opens a transient (italic) tab that the next click
    // replaces — the same behaviour as single-clicking in the normal Explorer.
    const reuse = !cfg.openInNewTab;

    // Non-markdown files (e.g. when `include` is extended to .txt) have no
    // rendered preview, so open them in a normal editor.
    if (!isMarkdown(node.fsPath) || cfg.defaultOpenMode === 'edit') {
      await vscode.commands.executeCommand('vscode.open', uri, { preview: reuse });
      return;
    }

    const options: vscode.TextDocumentShowOptions =
      cfg.defaultOpenMode === 'preview'
        ? { preview: reuse }
        : { viewColumn: vscode.ViewColumn.Beside, preview: reuse, preserveFocus: true };

    await vscode.commands.executeCommand('vscode.openWith', uri, MARKDOWN_PREVIEW_EDITOR, options);
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
    vscode.commands.registerCommand('docsExplorer.viewAsGrouped', () => deps.setMode('grouped')),
  );
}
