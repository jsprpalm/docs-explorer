import * as vscode from 'vscode';

export type OpenMode = 'previewToSide' | 'preview' | 'edit';
export type ViewLocation = 'activityBar' | 'explorer';

export interface DocsConfig {
  include: string;
  exclude: string;
  respectGitignore: boolean;
  pinnedPatterns: string[];
  defaultOpenMode: OpenMode;
  compactFolders: boolean;
  viewLocation: ViewLocation;
  openInNewTab: boolean;
}

export function getConfig(): DocsConfig {
  const c = vscode.workspace.getConfiguration('docsExplorer');
  return {
    include: c.get<string>('include', '**/*.{md,mdx,markdown}'),
    exclude: c.get<string>('exclude', '**/node_modules/**'),
    respectGitignore: c.get<boolean>('respectGitignore', true),
    pinnedPatterns: c.get<string[]>('pinnedPatterns', [
      '**/CLAUDE.md',
      'README.md',
      'AGENTS.md',
      '.claude/**',
    ]),
    defaultOpenMode: c.get<OpenMode>('defaultOpenMode', 'preview'),
    compactFolders: c.get<boolean>('compactFolders', true),
    viewLocation: c.get<ViewLocation>('viewLocation', 'activityBar'),
    openInNewTab: c.get<boolean>('openInNewTab', false),
  };
}
