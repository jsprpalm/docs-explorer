import * as vscode from 'vscode';
import { getConfig } from './config';
import { DocsTreeProvider, ViewMode } from './docsTreeProvider';
import { indexWorkspace } from './fileIndexer';
import { createWatcher } from './watcher';
import { registerCommands } from './commands';

const MODE_STATE_KEY = 'docsExplorer.mode';

export function activate(context: vscode.ExtensionContext): void {
  let mode: ViewMode = context.workspaceState.get<ViewMode>(MODE_STATE_KEY, 'tree');
  const syncModeContext = () =>
    vscode.commands.executeCommand('setContext', 'docsExplorer.flat', mode === 'flat');
  syncModeContext();

  const provider = new DocsTreeProvider(getConfig, () => mode);

  const reindex = async (): Promise<void> => {
    try {
      const index = await indexWorkspace(getConfig());
      provider.setIndex(index);
    } catch (err) {
      console.error('[Docs Explorer] indexing failed', err);
    }
  };

  const setMode = async (next: ViewMode): Promise<void> => {
    mode = next;
    await context.workspaceState.update(MODE_STATE_KEY, mode);
    syncModeContext();
    provider.refresh();
  };

  registerCommands(context, { getConfig, reindex, setMode });

  // The view lives in either the Activity Bar or the Explorer, toggled by the
  // `viewLocation` setting via `when` clauses. Register the provider on both ids;
  // only the currently-visible one renders.
  context.subscriptions.push(
    vscode.window.createTreeView('docsExplorerActivity', {
      treeDataProvider: provider,
      showCollapseAll: true,
    }),
    vscode.window.createTreeView('docsExplorerExplorer', {
      treeDataProvider: provider,
      showCollapseAll: true,
    }),
  );

  let watcher = createWatcher(getConfig().include, reindex);
  context.subscriptions.push({ dispose: () => watcher.dispose() });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        !e.affectsConfiguration('docsExplorer') &&
        !e.affectsConfiguration('files.exclude') &&
        !e.affectsConfiguration('search.exclude')
      ) {
        return;
      }
      // The watcher glob depends on `include`; recreate it if that changed.
      if (e.affectsConfiguration('docsExplorer.include')) {
        watcher.dispose();
        watcher = createWatcher(getConfig().include, reindex);
      }
      void reindex();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => void reindex()),
  );

  void reindex();
}

export function deactivate(): void {
  // Disposables registered on context.subscriptions are cleaned up automatically.
}
