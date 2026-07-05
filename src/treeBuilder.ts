// Pure tree-building logic. No `vscode` import — unit-tested directly.
import {
  DocNode,
  FileEntry,
  FileNode,
  FolderNode,
  baseName,
  compareLabels,
  dirName,
} from './model';

interface MutableFolder {
  name: string;
  /** POSIX path of this folder relative to the root. */
  path: string;
  folders: Map<string, MutableFolder>;
  files: FileEntry[];
}

export interface BuildTreeOptions {
  compactFolders: boolean;
  /** Prefix to keep node ids unique across workspace folders. */
  idPrefix?: string;
}

/**
 * Build a docs tree "backwards" from a flat list of file entries: only
 * directories that (transitively) contain a file are created, so empty
 * branches can never appear in the view.
 */
export function buildTree(files: FileEntry[], opts: BuildTreeOptions): DocNode[] {
  const prefix = opts.idPrefix ?? '';
  const root: MutableFolder = { name: '', path: '', folders: new Map(), files: [] };

  for (const file of files) {
    const parts = file.relativePath.split('/');
    parts.pop(); // drop the file name; folders only
    let cursor = root;
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let next = cursor.folders.get(part);
      if (!next) {
        next = { name: part, path: acc, folders: new Map(), files: [] };
        cursor.folders.set(part, next);
      }
      cursor = next;
    }
    cursor.files.push(file);
  }

  return convertChildren(root, opts.compactFolders, prefix);
}

/** Flat, path-sorted list of every file (used by the "flat list" view mode). */
export function buildFlatList(files: FileEntry[], idPrefix = ''): FileNode[] {
  return files
    .map((f) => toFileNode(f, idPrefix, dirName(f.relativePath) || undefined))
    .sort((a, b) => compareLabels(a.relativePath, b.relativePath));
}

function convertChildren(folder: MutableFolder, compact: boolean, idPrefix: string): DocNode[] {
  const folderNodes: FolderNode[] = [];
  for (const sub of folder.folders.values()) {
    folderNodes.push(convertFolder(sub, compact, idPrefix));
  }
  folderNodes.sort((a, b) => compareLabels(a.label, b.label));

  const fileNodes = folder.files
    .map((f) => toFileNode(f, idPrefix))
    .sort((a, b) => compareLabels(a.label, b.label));

  return [...folderNodes, ...fileNodes];
}

function convertFolder(folder: MutableFolder, compact: boolean, idPrefix: string): FolderNode {
  let label = folder.name;
  let cursor = folder;

  // Compact single-child directory chains: `a` -> `b` -> `c` becomes `a/b/c`,
  // but only while each level has exactly one subfolder and no files of its own.
  if (compact) {
    while (cursor.folders.size === 1 && cursor.files.length === 0) {
      const only = cursor.folders.values().next().value as MutableFolder;
      label = `${label}/${only.name}`;
      cursor = only;
    }
  }

  return {
    kind: 'folder',
    id: `${idPrefix}folder:${cursor.path}`,
    label,
    path: cursor.path,
    children: convertChildren(cursor, compact, idPrefix),
  };
}

function toFileNode(file: FileEntry, idPrefix: string, description?: string): FileNode {
  return {
    kind: 'file',
    id: `${idPrefix}file:${file.relativePath}`,
    label: baseName(file.relativePath),
    fsPath: file.fsPath,
    relativePath: file.relativePath,
    description,
  };
}
