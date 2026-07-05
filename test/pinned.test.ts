import { describe, it, expect } from 'vitest';
import { matchPinned } from '../src/pinned';
import { FileEntry } from '../src/model';

const entry = (relativePath: string): FileEntry => ({
  fsPath: `/ws/${relativePath}`,
  relativePath,
});

const DEFAULT = ['**/CLAUDE.md', 'README.md', 'AGENTS.md', '.claude/**'];

describe('matchPinned', () => {
  it('matches the root README.md but not a nested README', () => {
    const res = matchPinned([entry('README.md'), entry('docs/README.md')], DEFAULT);
    expect(res.map((f) => f.relativePath)).toEqual(['README.md']);
  });

  it('matches CLAUDE.md at the root and in subfolders', () => {
    const res = matchPinned([entry('CLAUDE.md'), entry('packages/api/CLAUDE.md')], DEFAULT);
    expect(res.map((f) => f.relativePath)).toEqual(['CLAUDE.md', 'packages/api/CLAUDE.md']);
  });

  it('matches files under .claude/', () => {
    const res = matchPinned([entry('.claude/commands/foo.md'), entry('.claude/x.md')], DEFAULT);
    expect(res.map((f) => f.relativePath)).toEqual(['.claude/commands/foo.md', '.claude/x.md']);
  });

  it('does not duplicate a file matched by multiple patterns', () => {
    const res = matchPinned([entry('CLAUDE.md')], ['**/CLAUDE.md', 'CLAUDE.md']);
    expect(res).toHaveLength(1);
  });

  it('returns an empty list when nothing matches', () => {
    expect(matchPinned([entry('src/notes.md')], DEFAULT)).toEqual([]);
  });
});
