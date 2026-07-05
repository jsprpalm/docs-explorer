# Changelog

All notable changes to **Docs Explorer** are documented here. This project
adheres to [Semantic Versioning](https://semver.org/) and the
[Keep a Changelog](https://keepachangelog.com/) format.

## [0.1.0] - 2026-07-05

Initial release.

### Added

- **Filtered markdown tree** filtered to branches that contain markdown, built
  backwards from the file matches so empty branches never appear. Single-child
  directory chains compact to `a/b/c` nodes.
- **Preview by default** — single-click opens the rendered markdown preview in
  the active editor group and reuses the tab like the Explorer does. Modes:
  `preview`, `previewToSide`, `edit`.
- **Pinned section** for `CLAUDE.md`, root `README.md`, `AGENTS.md`, and
  `.claude/**` (configurable via `docsExplorer.pinnedPatterns`).
- **Live updates** via a debounced file watcher; multi-root workspace support.
- **Three view modes** — Tree, Flat, and Grouped. Grouped buckets files into
  configurable convention-based groups with a **Recently changed** group on top.
- **Context menu** — open in editor, open preview full-screen, reveal in
  Explorer, copy relative path.
- **History** — "Show Timeline" (built-in Timeline) and "Show History (Git)"
  (`git log --follow` → Quick Pick → diff against the working tree).
- Settings for includes/excludes, `.gitignore` handling, view location
  (Activity Bar or Explorer), compact folders, groups, and more.
