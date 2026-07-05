import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface Commit {
  sha: string;
  shortSha: string;
  author: string;
  /** Relative date, e.g. "3 days ago". */
  date: string;
  subject: string;
}

// Unit-separator between fields; won't appear in commit metadata.
const FIELD = '\x1f';
const LOG_FORMAT = ['%H', '%h', '%an', '%ar', '%s'].join(FIELD);

/** Parse `git log` output produced with LOG_FORMAT. Pure and unit-tested. */
export function parseGitLog(stdout: string): Commit[] {
  const commits: Commit[] = [];
  for (const line of stdout.split('\n')) {
    if (!line) {
      continue;
    }
    const [sha, shortSha, author, date, subject] = line.split(FIELD);
    if (!sha) {
      continue;
    }
    commits.push({ sha, shortSha, author, date, subject: subject ?? '' });
  }
  return commits;
}

async function execGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

export async function isInsideWorkTree(cwd: string): Promise<boolean> {
  try {
    return (await execGit(['rev-parse', '--is-inside-work-tree'], cwd)).trim() === 'true';
  } catch {
    return false;
  }
}

/** Commits that touched `relativePath` (relative to `cwd`), following renames. */
export async function getFileHistory(cwd: string, relativePath: string): Promise<Commit[]> {
  const stdout = await execGit(
    ['log', '--follow', `--format=${LOG_FORMAT}`, '--', relativePath],
    cwd,
  );
  return parseGitLog(stdout);
}

/** File contents at a given commit. The `:./` prefix resolves relative to cwd. */
export async function getFileAtCommit(
  cwd: string,
  sha: string,
  relativePath: string,
): Promise<string> {
  return execGit(['show', `${sha}:./${relativePath}`], cwd);
}
