// Pure pinned-file matching. No `vscode` import — unit-tested directly.
import { minimatch } from 'minimatch';
import { FileEntry, compareLabels } from './model';

/**
 * Return the files matching any of the pinned glob patterns, de-duplicated and
 * sorted by relative path. Patterns are matched against the POSIX relative path,
 * so `README.md` matches only the root file while `**\/CLAUDE.md` matches all.
 */
export function matchPinned(files: FileEntry[], patterns: string[]): FileEntry[] {
  const seen = new Set<string>();
  const matched: FileEntry[] = [];

  for (const file of files) {
    if (seen.has(file.relativePath)) {
      continue;
    }
    if (patterns.some((p) => minimatch(file.relativePath, p, { dot: true }))) {
      seen.add(file.relativePath);
      matched.push(file);
    }
  }

  return matched.sort((a, b) => compareLabels(a.relativePath, b.relativePath));
}
