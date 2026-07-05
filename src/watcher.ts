import * as vscode from 'vscode';

/**
 * Watch the include glob and fire `onChange` (debounced) whenever a matching
 * file is created, deleted, or changed. Agents often write many files in quick
 * succession, so we coalesce bursts into a single re-index.
 */
export function createWatcher(
  include: string,
  onChange: () => void,
  debounceMs = 300,
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher(include);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      onChange();
    }, debounceMs);
  };

  watcher.onDidCreate(schedule);
  watcher.onDidDelete(schedule);
  watcher.onDidChange(schedule);

  return vscode.Disposable.from(watcher, {
    dispose: () => {
      if (timer) {
        clearTimeout(timer);
      }
    },
  });
}
