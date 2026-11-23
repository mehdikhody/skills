---
name: setup-tauri
description: Scaffold a new Tauri desktop/mobile app with SvelteKit (TypeScript, static SPA), setup-project (standards, Matt Pocock config, graphify), Svelte frontend sv add-ons (tailwindcss, ai-tools, eslint, mdsvex, paraglide, prettier, playwright, vitest), svelte-standards, and shadcn-svelte by relaying every interactive CLI prompt through the harness's structured question tool. Use when the user wants to start, create, bootstrap or scaffold a new Tauri app.
disable-model-invocation: true
---

# Setup Tauri

Scaffolds a new Tauri app with a SvelteKit frontend on any agent harness or model. It runs `npm create tauri-app@latest` first, layers `setup-project` on top, installs `svelte-standards` and the Svelte frontend `sv` add-ons, initializes `shadcn-svelte`, and verifies both the frontend and Rust backend.

Ask **nothing up front**. Every decision comes from relaying the CLIs' own prompts at the step where each runs. Keep a task list. Stop and report if a command fails; never skip a step silently.

## How to relay interactive CLI prompts

Whenever a CLI (`npm create tauri-app@latest`, `npx sv add`, `npx shadcn-svelte@latest init`, etc.) asks a question:

1. **Preferred (TTY available):** Run the CLI in an interactive terminal. Read each prompt and its choices, ask the user via the harness's structured question tool (e.g. `AskUserQuestion`, `ask_question`, or equivalent — recommended option first), and send their chosen keystrokes back to the terminal.
2. **Fallback (no interactive TTY):** Inspect the CLI with `--help` to find the flag or option string for that prompt, ask the user the same question through the structured question tool, and run the command non-interactively with their chosen flag.

Never guess an answer silently and never print a numbered list in chat.

---

## 1. Create the Tauri app (`npm create tauri-app@latest`)

Run `npm create tauri-app@latest` and relay every prompt to the user with these recommended defaults (the user may override any of them):

- **Frontend language:** TypeScript / JavaScript
- **Package manager:** `npm`
- **UI template:** SvelteKit (`sveltekit-ts`, static SPA mode — recommended so `npx sv add` works natively)
- **UI flavor:** TypeScript

Once created, enter the new project directory and run `npm install`. All subsequent commands run inside this project directory.

## 2. Base setup (`setup-project`)

Run the `setup-project` skill (`.agents/skills/setup-project/SKILL.md`; install `mehdikhody/skills --skill setup-project` if missing) in the project directory created in step 1. It handles:
- `git init -b main` and initial git setup,
- base skills (`standards`, `find-skills`, `mattpocock/skills`, `caveman`, `caveman-commit`, `ponytail`),
- `.gitignore` skill-link exclusions,
- `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`,
- Matt Pocock skills config (`setup-matt-pocock-skills`),
- `graphify` setup and initial graph.

## 3. Svelte frontend add-ons (`npx sv add`)

Run `npx sv add` and relay every prompt to the user. Present the `svelte-standards` frontend add-ons as the recommended choices (the user may add or drop any):

- `tailwindcss`
- `ai-tools`
- `eslint`
- `mdsvex`
- `paraglide`
- `prettier`
- `playwright`
- `vitest`

Relay every sub-prompt each chosen add-on asks (Paraglide languages, Playwright/Vitest demos, etc.) through the structured question tool.

## 4. `svelte-standards` skill and ignores

Install `svelte-standards` (using the same `-a <agents>` flag chosen in step 2, if any):

```sh
npx -y skills add mehdikhody/skills --skill svelte-standards -y
```

Follow `svelte-standards` to install its required companion skills (`frontend-design`, `web-design-guidelines`, `ui-taste` & `ios-design` from `https://uizze.sh/`, `shadcn-svelte`, `agent-browser`).

Append `@.agents/skills/svelte-standards/SKILL.md` to `AGENTS.md` (alongside `standards`; never remove existing lines or Svelte MCP / graphify blocks).

Keep installed skills, graph output, and Rust build artifacts out of graphify, formatting, linting, and git:
- `.graphifyignore`: add `src-tauri/target/`.
- `.prettierignore`: add `/.agents/`, `/.claude/skills/`, `/graphify-out/`, `/src-tauri/target/`.
- `eslint.config.js`: add `{ ignores: ['.agents/', '.claude/skills/', 'graphify-out/', 'src-tauri/target/'] }` right after `includeIgnoreFile(gitignorePath)`.
- `.gitignore`: ensure `.claude/skills/*` keeps real folders un-ignored (`!.claude/skills/graphify/`, `!.claude/skills/svelte-code-writer/`, `!.claude/skills/svelte-core-bestpractices/`).

## 5. `shadcn-svelte` and Persian font

1. Run `npx -y shadcn-svelte@latest init` with preset `b1f2J64kkE` and Tauri's default `$lib` aliases (pointing `--css` at whichever Tailwind CSS entry file `sv add tailwindcss` created, e.g. `src/routes/layout.css` or `src/app.css`):
   ```sh
   npx -y shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "$lib" --components-alias "$lib/components" --utils-alias "$lib/utils" --hooks-alias "$lib/hooks" --ui-alias "$lib/components/ui"
   ```
   Relay any prompt it asks (such as overwriting CSS variables) to the user through the structured question tool.
2. If the user included `fa` in Paraglide, install and configure `vazirmatn` in the CSS entry file following `svelte-standards`.

## 6. Checks and commits

1. If Paraglide was added, compile messages first (`npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`).
2. Run frontend checks (`npm run format`, `npm run lint`, `npm run check`) and fix anything they report.
3. Verify the Rust backend compiles by running `cargo check` inside `src-tauri/`.
4. Commit in logical groups following the `standards` skill (`caveman-commit` messages, one commit per logical change, no AI attribution, explicit paths staged — never `git add -A`). If graphify's post-commit hook updates `graphify-out/`, wait ~10 seconds and commit `graphify-out/` as `"Update graphify graph"`.

## 7. Report

Tell the user:
- The project directory, chosen Tauri template and Svelte add-ons, and installed skills.
- Any skipped steps or warnings from frontend or Rust (`cargo check`) checks.
- Next: run `npm run tauri dev`, and `/graphify .` if they want the full semantic graph on top of the AST one.
