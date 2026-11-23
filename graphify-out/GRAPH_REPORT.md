# Graph Report - skills  (2026-11-24)

## Corpus Check
- 19 files · ~9,495 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 95 nodes · 89 edges · 15 communities (10 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c1d8ead`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- README.md
- Setup SvelteKit
- Architecture: strict layering
- Setup project
- Setup Tauri
- Svelte frontend standards
- Working standards
- Domain Docs
- Issue tracker: Local Markdown
- Agent skills
- Changelog
- CLAUDE.md
- .claude/CLAUDE.md
- triage-labels.md
- GLOSSARY.md

## God Nodes (most connected - your core abstractions)
1. `Setup SvelteKit` - 10 edges
2. `Setup project` - 9 edges
3. `Setup Tauri` - 9 edges
4. `Architecture: strict layering` - 9 edges
5. `Working standards` - 7 edges
6. `Svelte frontend standards` - 7 edges
7. `Domain Docs` - 5 edges
8. `Issue tracker: Local Markdown` - 5 edges
9. `Agent skills` - 4 edges
10. `mehdikhody/skills` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (15 total, 5 thin omitted)

### Community 0 - "README.md"
Cohesion: 0.18
Nodes (7): Install, mehdikhody/skills, My skills, Backend stack & `sv` add-ons, General conventions, SvelteKit architecture & backend standards, What NOT to do

### Community 1 - "Setup SvelteKit"
Cohesion: 0.20
Nodes (10): 1. Base setup (`setup-project`), 2. Create the SvelteKit app (`sv create`), 3. Add-ons (`sv add`), 4. Svelte & SvelteKit standards skills, 5. `shadcn-svelte` and Persian font, 6. Minimal architecture wiring, 7. Checks and commits, 8. Report (+2 more)

### Community 2 - "Architecture: strict layering"
Cohesion: 0.20
Nodes (10): 1. Schema layer — `#lib/schema/*.schema.ts`, 2. DB schema layer — `#lib/server/db/schema/*.schema.ts`, 3. Query layer — `#lib/server/db/query/*.query.ts`, 4. Service layer — `#lib/server/services/*.service.ts`, 5. Remote layer — `*.remote.ts`, 6. Permissions layer — `#lib/permissions.ts` (when roles are used), Architecture: strict layering, `#lib/server/logger.ts` (+2 more)

### Community 3 - "Setup project"
Cohesion: 0.22
Nodes (9): 1. Where to set up, 2. Git, 3. Skills, 4. Working standards (`AGENTS.md` and `CLAUDE.md`), 5. Matt Pocock skills config, 6. graphify, 7. Commits, 8. Report (+1 more)

### Community 4 - "Setup Tauri"
Cohesion: 0.22
Nodes (9): 1. Create the Tauri app (`npm create tauri-app@latest`), 2. Base setup (`setup-project`), 3. Svelte frontend add-ons (`npx sv add`), 4. `svelte-standards` skill and ignores, 5. `shadcn-svelte` and Persian font, 6. Checks and commits, 7. Report, How to relay interactive CLI prompts (+1 more)

### Community 5 - "Svelte frontend standards"
Cohesion: 0.25
Nodes (8): 1. Required frontend companion skills, 2. Frontend `sv` add-ons, 3. `shadcn-svelte` initialization (`npx shadcn-svelte@latest init`), 4. UI components (`shadcn-svelte` & `shadcn-svelte-extras`), 5. Frontend design (`frontend-design`, `web-design-guidelines`, `ui-taste`, `ios-design`), 6. Browser verification (`agent-browser`), Persian font (`fa` locale), Svelte frontend standards

### Community 6 - "Working standards"
Cohesion: 0.29
Nodes (7): Before writing code (`ponytail`), Changelog, Codebase exploration (`graphify`), Commits (`caveman-commit`), Grilling (`grilling`, `grill-me`, `grill-with-docs`), Token efficiency (`caveman`), Working standards

### Community 7 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

### Community 8 - "Issue tracker: Local Markdown"
Cohesion: 0.33
Nodes (5): Conventions, Issue tracker: Local Markdown, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 9 - "Agent skills"
Cohesion: 0.40
Nodes (4): Agent skills, Domain docs, Issue tracker, Triage labels

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Setup SvelteKit` connect `Setup SvelteKit` to `README.md`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `Architecture: strict layering` connect `Architecture: strict layering` to `README.md`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `Setup project` connect `Setup project` to `README.md`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._