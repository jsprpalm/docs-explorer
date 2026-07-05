// Pure data model for the docs tree. This module must NOT import `vscode`
// so the tree-building logic stays unit-testable outside the extension host.

export interface FileEntry {
  /** Absolute path on disk. */
  fsPath: string;
  /** POSIX-style path relative to its workspace folder. */
  relativePath: string;
}

export interface SectionNode {
  kind: 'section';
  id: string;
  label: string;
  children: DocNode[];
}

export interface FolderNode {
  kind: 'folder';
  id: string;
  /** Display label; may be a compacted `a/b/c` chain. */
  label: string;
  /** POSIX path of the (deepest, when compacted) folder relative to its root. */
  path: string;
  children: DocNode[];
}

export interface FileNode {
  kind: 'file';
  id: string;
  label: string;
  fsPath: string;
  relativePath: string;
  /** Optional secondary text (e.g. the containing directory) for flat/pinned views. */
  description?: string;
}

export type DocNode = SectionNode | FolderNode | FileNode;

/** Case-insensitive comparison used for stable, human-friendly sorting. */
export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Directory portion of a relative path, or '' for a root-level file. */
export function dirName(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/');
  return idx < 0 ? '' : relativePath.slice(0, idx);
}

/** File name portion of a relative path. */
export function baseName(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/');
  return idx < 0 ? relativePath : relativePath.slice(idx + 1);
}
