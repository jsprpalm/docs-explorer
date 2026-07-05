import { describe, it, expect } from 'vitest';
import { groupFiles, OTHER_GROUP } from '../src/grouping';
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
