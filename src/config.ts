import * as vscode from 'vscode';
import { GroupDef, GroupSortBy } from './model';

export type OpenMode = 'previewToSide' | 'preview' | 'edit';
export type ViewLocation = 'activityBar' | 'explorer';

export const DEFAULT_GROUPS: GroupDef[] = [
  {
    name: 'Agent instructions',
    patterns: ['**/CLAUDE.md', '.claude/**', '**/AGENTS.md', '.cursor/rules/**'],
  },
  { name: 'Specs & plans', patterns: ['**/*.spec.md', '**/*.plan.md', 'docs/specs/**', 'plans/**'] },
  { name: 'Docs', patterns: ['docs/**', 'documentation/**'] },
  { name: 'ADRs & decisions', patterns: ['**/adr/**', '**/decisions/**', '**/*.adr.md'] },
  {
    name: 'Changelogs & meta',
    patterns: [
      '**/CHANGELOG.md',
      '**/CONTRIBUTING.md',
      '**/LICENSE.md',
      '**/CODE_OF_CONDUCT.md',
    ],
  },
];

export interface DocsConfig {
  include: string;
  exclude: string;
  respectGitignore: boolean;
  pinnedPatterns: string[];
  defaultOpenMode: OpenMode;
  compactFolders: boolean;
  viewLocation: ViewLocation;
  openInNewTab: boolean;
  groups: GroupDef[];
  groupSortBy: GroupSortBy;
  recentlyChangedMinutes: number;
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
    groups: c.get<GroupDef[]>('groups', DEFAULT_GROUPS),
    groupSortBy: c.get<GroupSortBy>('groupSortBy', 'modified'),
    recentlyChangedMinutes: c.get<number>('recentlyChangedMinutes', 5),
  };
}
