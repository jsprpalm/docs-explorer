// Pure grouping logic. No `vscode` import — unit-tested directly.
import { minimatch } from 'minimatch';
import {
  FileEntry,
  GroupDef,
  GroupNode,
  GroupSortBy,
  baseName,
  compareLabels,
  dirName,
  makeFileNode,
} from './model';

/** Files that match no configured group land here, appended last. */
export const OTHER_GROUP = 'Other';

/** Heading for the recently-changed shortcut group. */
export const RECENTLY_CHANGED_GROUP = 'Recently changed';

/**
 * Build the "Recently changed" group: files modified within the last `withinMs`
 * (relative to `now`), newest first. Additive — these files still appear in
 * their normal group. Returns undefined when disabled or empty. `now` and the
 * window are passed in so this stays pure and deterministic.
 */
export function recentlyChangedGroup(
  files: FileEntry[],
  withinMs: number,
  now: number,
  idPrefix = '',
  label = RECENTLY_CHANGED_GROUP,
): GroupNode | undefined {
  if (withinMs <= 0) {
    return undefined;
  }
  const threshold = now - withinMs;
  const recent = files
    .filter((f) => (f.mtime ?? 0) > 0 && (f.mtime ?? 0) >= threshold)
    .sort(
      (a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || compareLabels(a.relativePath, b.relativePath),
    );
  if (recent.length === 0) {
    return undefined;
  }
  return {
    kind: 'group',
    id: `${idPrefix}group:recent`,
    label,
    count: recent.length,
    children: recent.map((f) => makeFileNode(f, idPrefix, dirName(f.relativePath) || undefined)),
  };
}

/**
 * Assign each file to the FIRST group whose patterns match (priority order),
 * falling back to an "Other" bucket. Empty groups are omitted. Within a group,
 * files are sorted by last-modified (default) or name.
 */
export function groupFiles(
  files: FileEntry[],
  groups: GroupDef[],
  sortBy: GroupSortBy,
  idPrefix = '',
): GroupNode[] {
  const buckets = new Map<string, FileEntry[]>();
  const order: string[] = [];
  for (const g of groups) {
    if (!buckets.has(g.name)) {
      buckets.set(g.name, []);
      order.push(g.name);
    }
  }
  buckets.set(OTHER_GROUP, []);

  for (const file of files) {
    const group = groups.find((g) =>
      g.patterns.some((p) => minimatch(file.relativePath, p, { dot: true })),
    );
    buckets.get(group ? group.name : OTHER_GROUP)!.push(file);
  }

  const result: GroupNode[] = [];
  for (const name of [...order, OTHER_GROUP]) {
    const bucket = buckets.get(name);
    if (!bucket || bucket.length === 0) {
      continue;
    }
    const sorted = sortFiles(bucket, sortBy);
    result.push({
      kind: 'group',
      id: `${idPrefix}group:${name}`,
      label: name,
      count: sorted.length,
      children: sorted.map((f) => makeFileNode(f, idPrefix, dirName(f.relativePath) || undefined)),
    });
  }
  return result;
}

function sortFiles(files: FileEntry[], sortBy: GroupSortBy): FileEntry[] {
  const copy = [...files];
  if (sortBy === 'name') {
    copy.sort((a, b) => compareLabels(baseName(a.relativePath), baseName(b.relativePath)));
  } else {
    // Most-recently-modified first; ties broken by path for stable ordering.
    copy.sort(
      (a, b) => (b.mtime ?? 0) - (a.mtime ?? 0) || compareLabels(a.relativePath, b.relativePath),
    );
  }
  return copy;
}
