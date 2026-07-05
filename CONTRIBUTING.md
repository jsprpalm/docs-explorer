# Contributing

Thanks for your interest in Docs Explorer!

## Development

```bash
npm install
npm run build        # bundle with esbuild
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (pure logic)
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with the
extension loaded.

## Guidelines

- The pure logic lives in `vscode`-free modules (`treeBuilder`, `pinned`,
  `grouping`, `git` parsing) so it can be unit-tested with vitest. Keep new
  logic testable the same way and add tests under `test/`.
- Run `npm run lint`, `npm run typecheck`, and `npm test` before opening a PR;
  CI runs all three plus a packaging check.
- Keep changes focused and describe the user-facing behavior in the PR.

## Reporting issues

Open an issue with steps to reproduce, your VS Code version, and a small example
workspace layout if the problem is tree/grouping related.
