import { describe, it, expect } from 'vitest';
import { buildTree, buildFlatList } from '../src/treeBuilder';
import { DocNode, FileEntry, FileNode, FolderNode } from '../src/model';

const entry = (relativePath: string): FileEntry => ({
  fsPath: `/ws/${relativePath}`,
  relativePath,
});

const label = (n: DocNode) => n.label;

describe('buildTree', () => {
  it('only creates folders that contain files (no empty branches)', () => {
    const nodes = buildTree([entry('docs/a.md'), entry('b.md')], { compactFolders: false });
    expect(nodes.map((n) => n.kind)).toEqual(['folder', 'file']);
    const docs = nodes[0] as FolderNode;
    expect(docs.label).toBe('docs');
    expect(docs.children.map((c) => (c as FileNode).label)).toEqual(['a.md']);
  });

  it('sorts folders before files, case-insensitively', () => {
    const nodes = buildTree([entry('Zoo.md'), entry('apple.md'), entry('mid/x.md')], {
      compactFolders: false,
    });
    expect(nodes.map(label)).toEqual(['mid', 'apple.md', 'Zoo.md']);
  });

  it('compacts single-child folder chains into a/b/c', () => {
    const nodes = buildTree([entry('a/b/c/file.md')], { compactFolders: true });
    expect(nodes).toHaveLength(1);
    const folder = nodes[0] as FolderNode;
    expect(folder.label).toBe('a/b/c');
    expect(folder.children.map((c) => (c as FileNode).label)).toEqual(['file.md']);
  });

  it('does not compact a chain when compactFolders is off', () => {
    const nodes = buildTree([entry('a/b/c/file.md')], { compactFolders: false });
    const a = nodes[0] as FolderNode;
    expect(a.label).toBe('a');
    const b = a.children[0] as FolderNode;
    expect(b.label).toBe('b');
  });

  it('does not compact when a folder has multiple subfolders', () => {
    const nodes = buildTree([entry('a/b/x.md'), entry('a/c/y.md')], { compactFolders: true });
    const a = nodes[0] as FolderNode;
    expect(a.label).toBe('a');
    expect(a.children.map(label)).toEqual(['b', 'c']);
  });

  it('does not compact when a folder also contains a file', () => {
    const nodes = buildTree([entry('a/top.md'), entry('a/b/deep.md')], { compactFolders: true });
    const a = nodes[0] as FolderNode;
    expect(a.label).toBe('a');
    expect(a.children.map(label)).toEqual(['b', 'top.md']);
  });

  it('groups multiple files in the same directory', () => {
    const nodes = buildTree([entry('docs/b.md'), entry('docs/a.md')], { compactFolders: true });
    const docs = nodes[0] as FolderNode;
    expect(docs.children.map(label)).toEqual(['a.md', 'b.md']);
  });
});

describe('buildFlatList', () => {
  it('returns all files sorted by relative path', () => {
    const nodes = buildFlatList([entry('z.md'), entry('docs/a.md'), entry('a.md')]);
    expect(nodes.map((n) => n.relativePath)).toEqual(['a.md', 'docs/a.md', 'z.md']);
  });

  it('sets the directory as the description for nested files', () => {
    const nodes = buildFlatList([entry('docs/specs/x.md'), entry('root.md')]);
    const byPath = Object.fromEntries(nodes.map((n) => [n.relativePath, n.description]));
    expect(byPath['docs/specs/x.md']).toBe('docs/specs');
    expect(byPath['root.md']).toBeUndefined();
  });
});
