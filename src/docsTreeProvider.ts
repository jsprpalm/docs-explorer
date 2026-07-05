import * as vscode from 'vscode';
import { DocNode, FileNode, baseName, dirName } from './model';
import { WorkspaceIndex } from './fileIndexer';
import { buildTree, buildFlatList } from './treeBuilder';
import { groupFiles, recentlyChangedGroup } from './grouping';
import { matchPinned } from './pinned';
import { DocsConfig } from './config';

export type ViewMode = 'tree' | 'flat' | 'grouped';

export class DocsTreeProvider implements vscode.TreeDataProvider<DocNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<DocNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private index: WorkspaceIndex[] = [];
  private roots: DocNode[] = [];

  constructor(
    private readonly getConfig: () => DocsConfig,
    private readonly getMode: () => ViewMode,
  ) {}

  /** Replace the index and re-render. */
  setIndex(index: WorkspaceIndex[]): void {
    this.index = index;
    this.rebuild();
    this._onDidChangeTreeData.fire();
  }

  /** Re-render from the current index (e.g. after a mode or config change). */
  refresh(): void {
    this.rebuild();
    this._onDidChangeTreeData.fire();
  }

  private rebuild(): void {
    const cfg = this.getConfig();
    const mode = this.getMode();
    const topLevel: DocNode[] = [];

    const pinnedSection = this.buildPinnedSection(cfg);
    if (pinnedSection) {
      topLevel.push(pinnedSection);
    }

    // Grouped mode is a single flat, grouped list across all workspace folders.
    if (mode === 'grouped') {
      const allFiles = this.index.flatMap((wi) => wi.files);
      // "Recently changed" sits above the convention groups (distinct id prefix
      // so the same file's node id doesn't collide with its convention group).
      const recent = recentlyChangedGroup(
        allFiles,
        cfg.recentlyChangedMinutes * 60_000,
        Date.now(),
        'gr:',
      );
      if (recent) {
        topLevel.push(recent);
      }
      topLevel.push(...groupFiles(allFiles, cfg.groups, cfg.groupSortBy, 'g:'));
      this.roots = topLevel;
      return;
    }

    const multiRoot = this.index.length > 1;
    this.index.forEach((wi, i) => {
      const idPrefix = `w${i}:`;
      const children =
        mode === 'flat'
          ? buildFlatList(wi.files, idPrefix)
          : buildTree(wi.files, { compactFolders: cfg.compactFolders, idPrefix });

      if (multiRoot) {
        topLevel.push({
          kind: 'folder',
          id: `${idPrefix}root`,
          label: wi.folder.name,
          path: '',
          children,
        });
      } else {
        topLevel.push(...children);
      }
    });

    this.roots = topLevel;
  }

  private buildPinnedSection(cfg: DocsConfig): DocNode | undefined {
    const files: FileNode[] = [];
    for (const wi of this.index) {
      for (const f of matchPinned(wi.files, cfg.pinnedPatterns)) {
        files.push({
          kind: 'file',
          id: `pinned:${f.fsPath}`,
          label: baseName(f.relativePath),
          fsPath: f.fsPath,
          relativePath: f.relativePath,
          description: dirName(f.relativePath) || undefined,
        });
      }
    }
    if (files.length === 0) {
      return undefined;
    }
    return { kind: 'section', id: 'section:pinned', label: 'Pinned', children: files };
  }

  getChildren(element?: DocNode): DocNode[] {
    if (!element) {
      return this.roots;
    }
    return element.kind === 'file' ? [] : element.children;
  }

  getTreeItem(node: DocNode): vscode.TreeItem {
    if (node.kind === 'file') {
      const item = new vscode.TreeItem(
        vscode.Uri.file(node.fsPath),
        vscode.TreeItemCollapsibleState.None,
      );
      item.id = node.id;
      item.label = node.label;
      item.description = node.description;
      item.tooltip = node.relativePath;
      item.contextValue = 'file';
      item.command = { command: 'docsExplorer.openFile', title: 'Open', arguments: [node] };
      return item;
    }

    if (node.kind === 'section') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
      item.id = node.id;
      item.contextValue = 'section';
      item.iconPath = new vscode.ThemeIcon('pinned');
      return item;
    }

    if (node.kind === 'group') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
      item.id = node.id;
      item.contextValue = 'group';
      return item;
    }

    const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Collapsed);
    item.id = node.id;
    item.contextValue = 'folder';
    item.iconPath = vscode.ThemeIcon.Folder;
    return item;
  }
}
