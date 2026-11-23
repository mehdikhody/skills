# mehdikhody/skills

My agent skills — platform-, harness-, and model-agnostic working standards and project setup skills.

## Install

With the [`skills` CLI](https://github.com/vercel-labs/skills) (Claude Code, Codex, Cursor, OpenCode, Antigravity, …):

```sh
npx skills add mehdikhody/skills
```

As a Claude Code plugin:

```sh
/plugin marketplace add mehdikhody/skills
/plugin install mehdikhody-skills@mehdikhody-skills
```

## My skills

| Skill | What it does |
| --- | --- |
| [`standards`](skills/standards/SKILL.md) | Core working standards for every session across any agent harness or model: use `caveman` for lower read/write token usage; use `graphify` to find and explore the codebase before raw search; ask all grilling questions (`grilling`, `grill-me`, `grill-with-docs`) through the harness's structured question tool; use `ponytail` before writing code; use `caveman-commit` and logical commits without AI attribution; maintain `CHANGELOG.md` with Keep a Changelog 1.1.0. Auto-installs any missing required skill or tool. |
| [`svelte-standards`](skills/svelte-standards/SKILL.md) | Frontend working standards for Svelte 5 apps (extends `standards`): frontend `sv` add-ons (`ai-tools`, `eslint`, `mdsvex`, `paraglide`, `playwright`, `prettier`, `tailwindcss`, `vitest`); `npx shadcn-svelte@latest init --preset b1f2J64kkE` (asking the user via the harness's question tool when input is needed) + `vazirmatn` for Persian (`fa`); `shadcn-svelte` and `shadcn-svelte-extras` components only; unified frontend design skills (`frontend-design`, `web-design-guidelines`, `ui-taste`, and `ios-design` across all viewports); live UI verification with `agent-browser`. |
| [`sveltekit-standards`](skills/sveltekit-standards/SKILL.md) | Full-stack and backend working standards for SvelteKit 3 apps (extends `svelte-standards` and `standards`): backend `sv` add-ons (`drizzle`, `better-auth`, `sveltekit-adapter=adapter:node`, `experimental=features:async,remoteFunctions`), `neverthrow`, `zod`, `winston`/`chalk`/`lodash` logger, `paginate`, `@casl/ability`, subpath imports (`#lib/*`, `#db`, `#db/*`, `#services/*`), composed hooks, one file per table, server-only auth flows, and strict 6-layer architecture (Remote → Service → Query → DB). |
| [`setup-project`](skills/setup-project/SKILL.md) | Universal agent tooling foundation for any project folder (works standalone and as the base step of framework setup skills): installs `standards`, `find-skills`, `mattpocock/skills`, `caveman`, `caveman-commit` and `ponytail` (latest via `npx skills add`); configures `setup-matt-pocock-skills` (local markdown issues in `.scratch/`, default triage labels, single-context `GLOSSARY.md` + `docs/adr/`); sets up `graphify`; creates `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md` and `.gitignore` skill-link exclusions; commits following `standards`. Invoke with `/setup-project`. |
| [`setup-sveltekit`](skills/setup-sveltekit/SKILL.md) | Scaffolds a new SvelteKit 3 app on top of `setup-project`: relays every interactive CLI prompt (`sv create`, `sv add`, `drizzle-kit push`, `shadcn-svelte init --preset b1f2J64kkE`) to the user through the harness's structured question tool with recommended defaults; installs `svelte-standards` and `sveltekit-standards` (plus their companion skills); configures `vazirmatn` if `fa` is chosen; applies minimal architecture wiring (`#lib/*`/`#db`/`#services/*` subpath imports, `neverthrow`/`zod`/`winston`/`chalk`/`lodash`, `#lib/server/logger.ts`, `#lib/server/pagination.ts`, Drizzle schema folder, and `AGENTS.md` imports); runs format/lint/check and commits following `standards`. Invoke with `/setup-sveltekit`. |
| [`setup-tauri`](skills/setup-tauri/SKILL.md) | Scaffolds a new Tauri app with a SvelteKit frontend (`npm create tauri-app@latest`, recommended `sveltekit-ts` static SPA), layers `setup-project` on top (git, `standards`, Matt Pocock config, `graphify`), relays all interactive `sv add` (`tailwindcss`, `ai-tools`, `eslint`, `mdsvex`, `paraglide`, `prettier`, `playwright`, `vitest`) and `shadcn-svelte init --preset b1f2J64kkE` (`$lib` aliases) prompts via the harness's structured question tool, installs `svelte-standards` (and `vazirmatn` for `fa`), ignores `src-tauri/target/`, verifies frontend checks and `cargo check`, and commits following `standards`. Invoke with `/setup-tauri`. |
