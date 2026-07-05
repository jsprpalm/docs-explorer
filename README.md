# Docs Explorer

A reading-focused VS Code panel for your project's **markdown** documentation —
`CLAUDE.md`, specs, ADRs, and the rest. Built for workflows where docs are as
central as the code (e.g. developing with Claude Code), where markdown files
grow fast, become governing artifacts, and get lost among code files in the
normal Explorer.

## Features (Phase 1 – MVP)

- **Filtered tree** – shows only branches that contain markdown. Empty branches
  never appear. Single-child directory chains compact to `a/b/c` nodes.
- **Preview by default** – single-click opens the rendered markdown preview in
  the active editor group, reusing the current tab like the Explorer does (never
  spawning a new panel). Switch to `previewToSide` for a split view.
- **Pinned section** – `CLAUDE.md` (anywhere), root `README.md`, `AGENTS.md`,
  and everything under `.claude/` stay pinned at the top. Configurable.
- **Live updates** – a debounced file watcher keeps the tree in sync as files
  are created, renamed, or deleted (great when an agent is writing files).
- **Multi-root** – one top node per workspace folder.
- **Three view modes** – toolbar toggle between **Tree**, **Flat list**, and
  **Grouped**. Grouped bundles files into convention-based groups (Agent
  instructions, Specs & plans, Docs, ADRs & decisions, Changelogs & meta, and
  Other) with a per-group count, sorted by last-modified (default) or name.
  Groups and their globs are fully configurable.
- **Refresh** and **collapse-all** in the toolbar.
- **Context menu** – open in editor, open preview full-screen, reveal in
  Explorer, copy relative path.

## Settings

| Setting | Default | Description |
|---|---|---|
| `docsExplorer.include` | `**/*.{md,mdx,markdown}` | Glob for included files. Extend to include e.g. `.txt` (opens in the editor since preview is unavailable). |
| `docsExplorer.exclude` | `**/node_modules/**` | Extra exclude glob. |
| `docsExplorer.respectGitignore` | `true` | Filter out git-ignored files via the root `.gitignore`. |
| `docsExplorer.pinnedPatterns` | `["**/CLAUDE.md", "README.md", "AGENTS.md", ".claude/**"]` | Files pinned to the top. |
| `docsExplorer.defaultOpenMode` | `preview` | `preview` (active group, like the Explorer) \| `previewToSide` (split view) \| `edit` (source). |
| `docsExplorer.compactFolders` | `true` | Compress single-child directory chains. |
| `docsExplorer.viewLocation` | `activityBar` | `activityBar` \| `explorer`. |
| `docsExplorer.openInNewTab` | `false` | Open each file in a new tab instead of reusing one preview tab. |
| `docsExplorer.groups` | 5 built-in groups | Convention-based groups for the Grouped view; each file joins the first group whose globs match. |
| `docsExplorer.groupSortBy` | `modified` | Sort within a group: `modified` (newest first) or `name`. |

## Development

```bash
npm install
npm run build       # bundle with esbuild -> dist/extension.js
npm run typecheck   # tsc --noEmit
npm test            # vitest (pure tree/pinned logic)
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with the
extension loaded.

## License

MIT
