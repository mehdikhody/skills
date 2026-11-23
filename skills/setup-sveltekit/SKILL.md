---
name: setup-sveltekit
description: Scaffold a new SvelteKit 3 app on top of setup-project by relaying every interactive CLI prompt (sv create, sv add, drizzle-kit push, shadcn-svelte init) to the user through the harness's structured question tool, installing svelte-standards and sveltekit-standards, and applying minimal architecture wiring. Use when the user wants to start, create, bootstrap or scaffold a new SvelteKit project.
disable-model-invocation: true
---

# Setup SvelteKit

Scaffolds a new SvelteKit 3 app on any agent harness or model. It builds on `setup-project`, installs `svelte-standards` and `sveltekit-standards`, relays every interactive CLI prompt to the user through the harness's structured question tool, and finishes with minimal architecture wiring (no generated tables, hooks, auth flows, roles, or demo code — agents build those on demand following `sveltekit-standards`).

Ask **nothing up front**. Every decision comes from relaying the CLIs' own prompts at the step where each runs. Keep a task list. Stop and report if a command fails; never skip a step silently.

## How to relay interactive CLI prompts

Whenever a CLI (`sv create`, `sv add`, `drizzle-kit push`, `shadcn-svelte init`, etc.) asks a question:

1. **Preferred (TTY available):** Run the CLI in an interactive terminal. Read each prompt and its choices, ask the user via the harness's structured question tool (e.g. `AskUserQuestion`, `ask_question`, or equivalent — recommended option first), and send their chosen keystrokes back to the terminal.
2. **Fallback (no interactive TTY):** Inspect the CLI with `--help` to find the flag or option string for that prompt, ask the user the same question through the structured question tool, and run the command non-interactively with their chosen flag.

Never guess an answer silently and never print a numbered list in chat.

---

## 1. Base setup (`setup-project`)

Run the `setup-project` skill first (`.agents/skills/setup-project/SKILL.md`; install `mehdikhody/skills --skill setup-project` if missing). It handles:
- target directory and target agent harness(es),
- `git init -b main`,
- base skills (`standards`, `find-skills`, `mattpocock/skills`, `caveman`, `caveman-commit`, `ponytail`),
- `.gitignore` skill-link exclusions,
- `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`,
- Matt Pocock skills config (`setup-matt-pocock-skills`),
- `graphify` setup and initial graph.

All subsequent commands run inside the project directory from step 1.

## 2. Create the SvelteKit app (`sv create`)

Run `npx sv create` inside the project directory. If the directory already contains files from step 1 (`.agents/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `graphify-out/`, etc.), scaffold into `.sv-create`, move everything up into the project root (merging `.gitignore` rather than overwriting it), and delete `.sv-create`.

Relay every `sv create` prompt to the user with these recommended defaults (the user may override any of them):
- **Template:** Minimal (`minimal`)
- **Type checking:** TypeScript (`ts`)
- **Add-ons:** None yet (added interactively in step 3) — or select the standards add-ons directly if preferred
- **Package manager:** `npm`

Set `"name"` in `package.json` to the directory's kebab-case base name.

## 3. Add-ons (`sv add`)

Run `npx sv add` and relay every prompt to the user. Present the standards add-ons from `svelte-standards` and `sveltekit-standards` as the recommended choices (the user may add or drop any):

- **Frontend (`svelte-standards`):** `ai-tools`, `eslint`, `prettier`, `tailwindcss`, `vitest`, `playwright`, `paraglide`, `mdsvex`, `enhanced-img`
- **Backend (`sveltekit-standards`):** `sveltekit-adapter` (recommended: `node`), `experimental` (recommended: `async` + `remoteFunctions`), `drizzle`, `better-auth`

Relay every sub-prompt each chosen add-on asks (database dialect, Docker/connection options, Paraglide languages, Playwright/Vitest/auth demos, etc.) through the structured question tool.

If the user chose Drizzle and a database is ready, run `npm run db:push` (or `npx drizzle-kit push`) and relay its confirmation prompt to the user.

## 4. Svelte & SvelteKit standards skills

Install `svelte-standards` and `sveltekit-standards` (using the same `-a <agents>` flag chosen in step 1, if any):

```sh
npx -y skills add mehdikhody/skills --skill svelte-standards sveltekit-standards -y
```

Follow `svelte-standards` to install its required companion skills (`frontend-design`, `web-design-guidelines`, `ui-taste` & `ios-design` from `https://uizze.sh/`, `shadcn-svelte`, `agent-browser`).

Keep installed skills and graph output out of formatting, linting, and git:
- `.prettierignore`: add `/.agents/`, `/.claude/skills/`, `/graphify-out/`.
- `eslint.config.js`: add `{ ignores: ['.agents/', '.claude/skills/', 'graphify-out/'] }` right after `includeIgnoreFile(gitignorePath)`.
- `.gitignore`: ensure `.claude/skills/*` keeps real folders un-ignored (`!.claude/skills/graphify/`, `!.claude/skills/svelte-code-writer/`, `!.claude/skills/svelte-core-bestpractices/`), plus `logs/` for the logger.

## 5. `shadcn-svelte` and Persian font

1. Run `npx -y shadcn-svelte@latest init` with preset `b1f2J64kkE` and the `#lib` subpath aliases:
   ```sh
   npx -y shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "#lib" --components-alias "#lib/components" --utils-alias "#lib/utils" --hooks-alias "#lib/hooks" --ui-alias "#lib/components/ui"
   ```
   Relay any prompt it asks (such as overwriting CSS variables in `src/routes/layout.css`) to the user through the structured question tool.
2. If the user included `fa` in Paraglide, install and configure `vazirmatn` in `src/routes/layout.css` following `svelte-standards`.

## 6. Minimal architecture wiring

Apply only the base wiring required by `sveltekit-standards` — do **not** generate tables, hooks, auth services, roles, or demo code:

1. **Libraries:**
   ```sh
   npm i neverthrow zod winston chalk lodash
   npm i -D @types/lodash
   ```
   *(Install `@casl/ability` later if/when the project adds roles.)*
2. **Subpath imports** in `package.json` `"imports"` (next to `#lib` / `#lib/*`):
   ```json
   "#db": "./src/lib/server/db/index.ts",
   "#db/*": "./src/lib/server/db/*",
   "#services/*": "./src/lib/server/services/*"
   ```
3. **Shared server helpers:** Create `src/lib/server/logger.ts` and `src/lib/server/pagination.ts` using the exact implementations in `sveltekit-standards`.
4. **Drizzle schema folder (if Drizzle was added):** Point `drizzle.config.ts` at `schema: './src/lib/server/db/schema'`.
5. **`AGENTS.md`:** Append imports for `svelte-standards` and `sveltekit-standards` alongside `standards` (never remove existing lines or Svelte MCP / graphify blocks):
   ```markdown
   @.agents/skills/svelte-standards/SKILL.md
   @.agents/skills/sveltekit-standards/SKILL.md
   ```

## 7. Checks and commits

1. If Paraglide was added, compile messages first (`npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`).
2. Run `npm run format`, `npm run lint`, and `npm run check`, and fix anything they report.
3. Commit in logical groups following the `standards` skill (`caveman-commit` messages, one commit per logical change, no AI attribution, explicit paths staged — never `git add -A`). If graphify's post-commit hook updates `graphify-out/`, wait ~10 seconds and commit `graphify-out/` as `"Update graphify graph"`.

## 8. Report

Tell the user:
- The project directory, chosen add-ons, and installed skills.
- Any skipped steps or warnings from checks.
- Next: run `npm run dev`, and `/graphify .` if they want the full semantic graph on top of the AST one.
