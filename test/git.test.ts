import { describe, it, expect } from 'vitest';
import { parseGitLog } from '../src/git';

const FIELD = '\x1f';
const line = (sha: string, short: string, author: string, date: string, subject: string) =>
  [sha, short, author, date, subject].join(FIELD);

describe('parseGitLog', () => {
  it('parses field-separated commit lines', () => {
    const stdout =
      [
        line('abc123def', 'abc123d', 'Jane Doe', '2 days ago', 'Fix typo'),
        line('999888777', '9998887', 'John Roe', '3 weeks ago', 'Add section'),
      ].join('\n') + '\n';

    const commits = parseGitLog(stdout);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toEqual({
      sha: 'abc123def',
      shortSha: 'abc123d',
      author: 'Jane Doe',
      date: '2 days ago',
      subject: 'Fix typo',
    });
    expect(commits[1].subject).toBe('Add section');
  });

  it('ignores blank lines', () => {
    expect(parseGitLog('\n\n')).toEqual([]);
  });

  it('keeps a plain subject intact', () => {
    const commits = parseGitLog(line('a', 'a', 'x', 'now', 'hello world') + '\n');
    expect(commits[0].subject).toBe('hello world');
  });

  it('tolerates a missing subject', () => {
    const commits = parseGitLog(['a', 'a', 'x', 'now'].join(FIELD) + '\n');
    expect(commits[0].subject).toBe('');
  });
});
