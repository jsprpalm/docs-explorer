import { describe, it, expect } from 'vitest';
import { groupFiles, recentlyChangedGroup, OTHER_GROUP } from '../src/grouping';
import { FileEntry, GroupDef } from '../src/model';

const entry = (relativePath: string, mtime = 0): FileEntry => ({
  fsPath: `/ws/${relativePath}`,
  relativePath,
  mtime,
});

const GROUPS: GroupDef[] = [
  { name: 'Agent instructions', patterns: ['**/CLAUDE.md', '.claude/**', '**/AGENTS.md'] },
  { name: 'Specs & plans', patterns: ['**/*.spec.md', 'plans/**'] },
  { name: 'Docs', patterns: ['docs/**'] },
];

describe('groupFiles', () => {
  it('places each file in the first matching group (priority order)', () => {
    // docs/api.spec.md matches both "Specs & plans" and "Docs"; Specs wins.
    const groups = groupFiles([entry('docs/api.spec.md')], GROUPS, 'name');
    expect(groups.map((g) => g.label)).toEqual(['Specs & plans']);
  });

  it('collects unmatched files into an implicit Other group, appended last', () => {
    const groups = groupFiles([entry('CLAUDE.md'), entry('random/notes.md')], GROUPS, 'name');
    expect(groups.map((g) => g.label)).toEqual(['Agent instructions', OTHER_GROUP]);
    const other = groups.find((g) => g.label === OTHER_GROUP)!;
    expect(other.children.map((c) => c.relativePath)).toEqual(['random/notes.md']);
  });

  it('omits empty groups and reports counts', () => {
    const groups = groupFiles([entry('docs/a.md'), entry('docs/b.md')], GROUPS, 'name');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Docs');
    expect(groups[0].count).toBe(2);
  });

  it('keeps groups in configured order', () => {
    const groups = groupFiles(
      [entry('docs/a.md'), entry('CLAUDE.md'), entry('x.spec.md')],
      GROUPS,
      'name',
    );
    expect(groups.map((g) => g.label)).toEqual(['Agent instructions', 'Specs & plans', 'Docs']);
  });

  it('sorts within a group by name', () => {
    const groups = groupFiles([entry('docs/z.md'), entry('docs/a.md')], GROUPS, 'name');
    expect(groups[0].children.map((c) => c.label)).toEqual(['a.md', 'z.md']);
  });

  it('sorts within a group by modified time (newest first)', () => {
    const groups = groupFiles(
      [entry('docs/old.md', 100), entry('docs/new.md', 200)],
      GROUPS,
      'modified',
    );
    expect(groups[0].children.map((c) => c.label)).toEqual(['new.md', 'old.md']);
  });

  it('sets the containing directory as each file description', () => {
    const groups = groupFiles([entry('docs/sub/a.md')], GROUPS, 'name');
    expect(groups[0].children[0].description).toBe('docs/sub');
  });
});

describe('recentlyChangedGroup', () => {
  const now = 1_000_000_000_000;
  const min = 60_000;

  it('includes only files modified within the window, newest first', () => {
    const group = recentlyChangedGroup(
      [
        entry('a.md', now - 1000), // 1s ago
        entry('b.md', now - 10 * min), // 10 min ago (outside)
        entry('c.md', now - 1 * min), // 1 min ago
      ],
      5 * min,
      now,
    );
    expect(group?.label).toBe('Recently changed');
    expect(group?.children.map((c) => c.label)).toEqual(['a.md', 'c.md']);
    expect(group?.count).toBe(2);
  });

  it('excludes files with unknown (0) mtime', () => {
    const group = recentlyChangedGroup([entry('a.md', 0), entry('b.md', now)], 5 * min, now);
    expect(group?.children.map((c) => c.label)).toEqual(['b.md']);
  });

  it('returns undefined when disabled (window <= 0)', () => {
    expect(recentlyChangedGroup([entry('a.md', now)], 0, now)).toBeUndefined();
  });

  it('returns undefined when nothing is recent', () => {
    expect(recentlyChangedGroup([entry('a.md', now - 60 * min)], 5 * min, now)).toBeUndefined();
  });
});
