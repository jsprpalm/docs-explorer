# Spec: Docs Explorer

VS Code-extension som ger en dedikerad panel för projektets markdown-filer – byggd för arbetsflöden där dokumentation (CLAUDE.md, specar, ADR:er) är lika central som koden, t.ex. vid utveckling med Claude Code.

## Problem

Vid agentbaserad kodning växer mängden markdown-filer snabbt och de blir styrande artefakter snarare än bihang. I vanliga Explorer-trädet drunknar de bland kodfiler, och de öppnas i edit-läge fast man oftast bara vill läsa dem. Det saknas en snabb, läsfokuserad vy över enbart projektets dokumentation.

## Målbild

En panel som:

1. Visar filträdet filtrerat till enbart grenar som innehåller markdown-filer.
2. Öppnar filer i preview-läge som default, med enkel växling till edit.
3. (Senare) Grupperar filerna smart så att trädnavigering minimeras.
4. (Senare) Ger snabb åtkomst till filens ändringshistorik.

---

## Fas 1 – MVP: Filtrerat träd + preview

### Panel

- Egen ikon i Activity Bar ("Docs Explorer") med en `TreeView`.
- Alternativt/även: setting för att istället visa panelen som sektion i Explorer-sidopanelen (`contributes.views.explorer`). Default: egen Activity Bar-ikon.

### Trädlogik

- Hitta filer med `workspace.findFiles(includeGlob, excludeGlob)`.
- Default include: `**/*.{md,mdx,markdown}`.
- Default exclude: `**/node_modules/**` + respektera `.gitignore` (via `files.exclude`/`search.exclude` och `useIgnoreFiles`-beteende).
- Bygg trädet från filträffarna "baklänges": endast kataloger som (transitivt) innehåller minst en träff visas. Tomma grenar existerar aldrig i vyn.
- Kataloger med en enda underkatalog komprimeras till `a/b/c`-noder (samma beteende som VS Codes "compact folders"), styrt av setting.
- Multi-root workspaces: en toppnod per workspace-folder.

### Pinnade filer

- Sektion överst i panelen ("Pinned") som alltid visar, om de finns:
  - `CLAUDE.md` (alla förekomster, även i undermappar)
  - `README.md` (endast rot)
  - `AGENTS.md`
  - allt under `.claude/` som matchar include-globben
- Listan över pin-mönster är en setting (`docsExplorer.pinnedPatterns`, array av globs).

### Interaktion

- **Enkelklick** på fil: öppna markdown-preview vid sidan av (`markdown.showPreviewToSide`). Trädet och ev. aktiv editor behålls; samma preview-flik återanvänds för nästa klick (setting: `openInNewTab`, default false).
- **Kontextmeny** på fil:
  - "Open in editor" (vanlig editor / edit-läge)
  - "Open preview in full editor" (`markdown.showPreview`, tar hela editorytan)
  - "Reveal in Explorer"
  - "Copy relative path"
- **Toolbar-knappar** i panelen:
  - Collapse all
  - Refresh (manuell omindexering)
  - Toggle: träd-vy / platt lista (platt lista = alla filer sorterade på path, bra i små projekt)

### Live-uppdatering

- `FileSystemWatcher` på include-globben: skapade/raderade/omdöpta filer uppdaterar trädet direkt. Kritiskt för Claude Code-flödet där agenten skapar filer medan man tittar.
- Debounce (~300 ms) för att hantera att agenter ofta skriver många filer i snabb följd.

### Settings (fas 1)

| Setting | Typ | Default | Beskrivning |
|---|---|---|---|
| `docsExplorer.include` | string | `**/*.{md,mdx,markdown}` | Glob för vilka filer som ingår. Kan utökas för att t.ex. inkludera `.txt` (`**/*.{md,mdx,markdown,txt}`) – icke-markdown-filer öppnas då i editorn eftersom preview saknas |
| `docsExplorer.exclude` | string | `**/node_modules/**` | Extra exclude-glob (utöver .gitignore) |
| `docsExplorer.respectGitignore` | boolean | `true` | Filtrera bort git-ignorerade filer |
| `docsExplorer.pinnedPatterns` | string[] | `["**/CLAUDE.md", "README.md", "AGENTS.md", ".claude/**"]` | Filer som pinnas överst |
| `docsExplorer.defaultOpenMode` | enum | `previewToSide` | `previewToSide` \| `preview` \| `edit` |
| `docsExplorer.compactFolders` | boolean | `true` | Komprimera enkelbarns-kataloger |
| `docsExplorer.viewLocation` | enum | `activityBar` | `activityBar` \| `explorer` |

### Icke-mål i fas 1

- Ingen egen markdown-rendering/webview – inbyggda previewn används rakt av.
- Ingen sökning i filinnehåll (VS Codes vanliga sök täcker det).
- Ingen historik.

---

## Fas 2 – Smart gruppering

Mål: minska trädnavigering genom att visa en platt, grupperad lista istället för katalogträd.

### Konventionsbaserade grupper (default)

Regelmotor som matchar filer mot grupper i prioritetsordning:

1. **Agent instructions** – `CLAUDE.md`, `.claude/**`, `AGENTS.md`, `.cursor/rules/**` m.fl.
2. **Specs & plans** – `**/*.spec.md`, `**/*.plan.md`, `docs/specs/**`, `plans/**`
3. **Docs** – `docs/**`, `documentation/**`
4. **ADRs / decisions** – `**/adr/**`, `**/decisions/**`, `**/*.adr.md`
5. **Changelogs & meta** – `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE.md`, `CODE_OF_CONDUCT.md`
6. **Other** – allt övrigt, med relativ path som subtitel

Grupperna och deras mönster är konfigurerbara som setting (array av `{ name, patterns }`), så användare kan spegla sin egen projektkonvention.

### UI

- Toggle i panelens toolbar: Träd / Platt / Grupperad (ersätter fas 1:s tvålägestoggle).
- Inom grupp: sortering på senast ändrad (default) eller namn – senast ändrad är ofta mest relevant när en agent nyss skrivit filer.
- Badge per grupp med antal filer.

### Möjlig påbyggnad (fas 2.5)

- "Recently changed"-grupp överst: filer ändrade senaste N minuter, för att direkt se vad agenten just producerat.

---

## Fas 3 – Historik

Mål: se hur en dokumentfil förändrats över tid utan att lämna panelen.

### Steg 1 (billigt)

- Kontextmeny "Show timeline": öppnar VS Codes inbyggda Timeline-vy för filen (git-historik + lokala ändringar). Noll egen kod för själva historiken.

### Steg 2 (eget UI, om steg 1 inte räcker)

- Kontextmeny "Show history": Quick Pick-lista med commits som rört filen (`git log --follow --format=... -- <fil>`).
- Val av commit öppnar `vscode.diff` mellan `git show <sha>:<fil>` och nuvarande version.
- Kräver git i workspace; menyalternativet döljs annars.

### Uttalat icke-mål

- Ingen egen diff-rendering av markdown (renderad "visuell diff" är ett separat, stort projekt).

---

## Teknik

- **Språk/stack:** TypeScript, VS Code Extension API. Ingen bundlad markdown-renderare.
- **Centrala API:er:** `TreeDataProvider`, `workspace.findFiles`, `FileSystemWatcher`, `commands.executeCommand('markdown.showPreview')`, `vscode.diff`, `extensions.getExtension('vscode.git')` (fas 3).
- **Prestanda:** indexering är asynkron; trädet renderas progressivt. Mål: < 1 s till första rendering i repo med 10 000 filer.
- **Aktivering:** `onView:docsExplorer` – extensionen laddas inte förrän panelen öppnas.

## Publicering

- Marketplace-namn: **Docs Explorer** (verifierat ledigt 2026-07-05). Inkludera "markdown" tydligt i description och `keywords` i `package.json` så extensionen rankar på markdown-sökningar.
- Ikon och README med GIF-demo.
- Licens: MIT.
- CI: lint + `vsce package` på tag.

## Beslutade frågor

- **Klickbeteende:** enkelklick öppnar preview vid sidan av (`markdown.showPreviewToSide`) – trädet och aktiv editor behålls, precis som när man öppnar vanliga filer i Explorer.
- **`.txt`-filer:** ingår inte som default men kan inkluderas via `docsExplorer.include`-settingen. Inget extra byggs för detta i fas 1.
- **Namn:** Docs Explorer ("Markdown Explorer" var upptaget på marketplace).
