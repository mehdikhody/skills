---
name: setup-sveltekit-project
description: Scaffold a new SvelteKit app with my standard stack (sv add-ons, Postgres via Drizzle, optional better-auth with username/password + SMS 2FA over FarazSMS, Paraglide, shadcn-svelte), my skill group, graphify, the Matt Pocock skills config and my CLAUDE.md rules. Use when the user wants to start, create, bootstrap or scaffold a new SvelteKit project or app.
disable-model-invocation: true
---

# Setup SvelteKit project

Creates a new SvelteKit 3 app end to end. Files this skill ships live next to this `SKILL.md`; below, `<skill>` means this skill's folder.

Work through the steps in order. Ask the user only the questions listed in step 1 (through `AskUserQuestion`, recommended option first); decide everything else from this file. Keep a task list. Stop and report if a command fails; never skip a step silently.

## 1. Ask up front

Ask all of these in one `AskUserQuestion` round (the app name can come from the user's message; ask only if it didn't):

1. **App name**: kebab-case folder and package name. Also used for the database name.
2. **Drizzle + Postgres?** Default yes.
3. **Paraglide base locale**: `fa` (then `en`) or `en` (then `fa`). Default `fa`.
4. **better-auth?** Default yes. Login is username + password, with the phone number as an always-on SMS second step (FarazSMS). If drizzle is declined, better-auth is not offered (it needs the database).

Create the app in the current working directory as `./<app-name>` unless the user named another parent folder. All later commands run inside `./<app-name>`.

## 2. Create the app

```sh
npx sv create <app-name> --template minimal --types ts --no-add-ons --install npm
cd <app-name>
git init -b main && git add -A && git commit -m "Create SvelteKit app"
```

## 3. Add-ons

Run one `sv add` with every chosen add-on. Each option is set explicitly so nothing prompts:

```sh
npx sv add --no-git-check --install npm \
  "ai-tools=ide:claude-code+delivery:tools+tools:mcp,svelte-code-writer,svelte-core-bestpractices,svelte-file-editor+mcpSetup:local+agentsMd:yes+optInSkills:none" \
  "drizzle=database:postgresql+postgresql:postgres.js+docker:no" \
  eslint prettier "playwright=demo:no" "tailwindcss=plugins:none" "vitest=usages:unit,component" \
  "paraglide=languageTags:<base>,<other>+demo:no" \
  "sveltekit-adapter=adapter:node" \
  "better-auth=demo:none" \
  enhanced-img mdsvex "experimental=features:async,remoteFunctions"
```

- Drop the `drizzle=...` and `better-auth=...` arguments when declined.
- `<base>,<other>` is `fa,en` or `en,fa` from step 1.
- Docker is off on purpose: the user runs Postgres in Docker Desktop (step 4).

Then install the libraries the architecture rules use. Always:

```sh
npm i neverthrow zod
```

Add `@casl/ability` only when better-auth was chosen.

## 4. Database (only with drizzle)

Create the database on the user's Docker Desktop Postgres. Don't ask for credentials; find them:

1. `docker ps --format "{{.Names}} {{.Image}} {{.Ports}}"`: pick the running container whose image is `postgres*`. If none is running, stop and tell the user.
2. Read its credentials: `docker inspect <container> --format "{{range .Config.Env}}{{println .}}{{end}}"` gives `POSTGRES_USER` (default `postgres`) and `POSTGRES_PASSWORD`. The host port comes from the `docker ps` ports column (usually `5432`).
3. Database name = app name with `-` replaced by `_`. Create it if it's missing:
   ```sh
   docker exec <container> psql -U <user> -tc "SELECT 1 FROM pg_database WHERE datname = '<db_name>'" | grep -q 1 || docker exec <container> psql -U <user> -c "CREATE DATABASE <db_name>"
   ```
4. Write `.env` (git-ignored) with `DATABASE_URL="postgres://<user>:<password>@localhost:<port>/<db_name>"`. URL-encode the password. With better-auth, also set `ORIGIN="http://localhost:5173"` and `BETTER_AUTH_SECRET="<32 random bytes, base64url>"` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).

## 5. Layering scaffold

Add these subpath imports to `package.json` `"imports"`, next to the `#lib` entries `sv` created:

```json
"#db": "./src/lib/server/db/index.ts",
"#db/*": "./src/lib/server/db/*",
"#services/*": "./src/lib/server/services/*"
```

With drizzle, move the DB schema into a folder, one file per entity:

- Delete the sample `src/lib/server/db/schema.ts` (the `task` table).
- Move `src/lib/server/db/auth.schema.ts` to `src/lib/server/db/schema/auth.schema.ts` (only with better-auth).
- In `drizzle.config.ts`, set `schema: './src/lib/server/db/schema/*.schema.ts'`.
- In `package.json`, point the `auth:schema` script's `--output` at `src/lib/server/db/schema/auth.schema.ts`.
- Without better-auth: copy `<skill>/templates/auth/src/lib/server/db/index.ts` over `src/lib/server/db/index.ts`, and create `src/lib/server/db/schema/index.ts` as an empty barrel (`export {};`) for future entities.

## 6. better-auth + permissions + example entity (only with better-auth)

Copy everything under `<skill>/templates/auth/` into the app, keeping paths and overwriting what `sv` generated:

| File | What it is |
| --- | --- |
| `src/env.ts` | sv's variables plus `SMS_TRANSPORT` and `FARAZSMS_*` |
| `src/app.d.ts` | `locals.user`, `locals.session`, `locals.permissions` |
| `src/hooks.server.ts` | paraglide + better-auth; sets guest or user permissions on every request |
| `src/lib/server/auth.ts` | username, phoneNumber and twoFactor (SMS OTP only) plugins; 2FA forced on for every user; phone required at signup |
| `src/lib/auth-client.ts` | browser auth client with the matching plugins |
| `src/lib/phone-number.ts` | Iranian mobile normalisation (+98 E.164), local form, placeholder email |
| `src/lib/server/sms/sms.ts`, `farazsms.ts` | `console` transport in dev, FarazSMS pattern API in prod |
| `src/lib/permissions.ts` | CASL `definePermissionsFor` / `defineGuestPermissions` |
| `src/lib/schema/user.schema.ts`, `post.schema.ts` | shared constants and Zod input schemas |
| `src/lib/server/db/index.ts`, `db/schema/index.ts`, `db/schema/post.schema.ts` | Drizzle client and tables |
| `src/lib/server/db/query/post.query.ts` | Query layer example |
| `src/lib/server/services/post.service.ts` | Service layer example (type + instance permission checks) |
| `src/lib/remotes/post.remote.ts` | Remote layer example |

Then:

1. Append to `.env.example`:
   ```sh
   # How SMS is sent: console (development default; codes are logged) | farazsms (production default)
   # SMS_TRANSPORT=console

   # FarazSMS (IranPayamak) pattern sending; every pattern must be approved in the FarazSMS panel.
   # FARAZSMS_API_KEY=
   # FARAZSMS_LINE_NUMBER=
   # FARAZSMS_PATTERN_VERIFICATION_CODE=   # one variable: code
   ```
2. `npx svelte-kit sync` (the auth CLI needs the generated `$app/tsconfig`), then `npm run auth:schema` to regenerate `db/schema/auth.schema.ts` with the username, phone, twoFactor and role columns.

## 7. Database schema push (only with drizzle)

`npm run db:push`. If it prompts, the database is new, so accept creating every table.

## 8. shadcn-svelte

```sh
npx shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "#lib" --components-alias "#lib/components" --utils-alias "#lib/utils" --hooks-alias "#lib/hooks" --ui-alias "#lib/components/ui"
```

It ends with one Yes/No prompt (overwrite the CSS variables in `layout.css`) that can't be answered from a non-interactive shell. Run it in a terminal the user can see (in the Claude desktop app, `run_in_terminal`) and answer **Yes**, or ask the user to run it and confirm. Then `npm ci`.

### Persian font (when `fa` is one of the locales)

Run this after shadcn init, because init overwrites `layout.css`:

1. `npm i vazirmatn`
2. In `src/routes/layout.css`, right after `@import 'tailwindcss';`, add `@import 'vazirmatn/Vazirmatn-Variable-font-face.css';`. This is a single variable woff2 covering weights 100–900, family name `'Vazirmatn'`.
3. Make Persian pages use it. The `<html lang>` comes from Paraglide (`%paraglide.lang%`), so scope the font to `html:lang(fa)` and keep the preset's fonts as the Latin fallback. Look at how the preset defines `--font-sans` and `--font-heading` in `layout.css`:
   - In `@theme`, or as plain `:root` variables, so the utilities read `var(--font-sans)`: override the variables after the preset's definitions:
     ```css
     html:lang(fa) {
     	--font-sans: 'Vazirmatn', <preset sans stack>;
     	--font-heading: 'Vazirmatn', <preset heading stack>;
     }
     ```
   - In `@theme inline`, so the utilities hard-code the stack: add an unlayered rule instead:
     ```css
     html:lang(fa) body,
     html:lang(fa) .font-sans,
     html:lang(fa) .font-heading {
     	font-family: 'Vazirmatn', <preset stack>;
     }
     ```
4. Check it in the browser on a `fa` page: the computed `font-family` of body text and headings starts with Vazirmatn, and on an `en` page it doesn't.

## 9. Skills

Copy `<skill>/skills-lock.json` to the app root and restore every pinned third-party skill for Claude Code:

```sh
npx skills experimental_install -a claude-code
```

This installs 38 skills into `.agents/skills/`, linked from `.claude/skills/`: find-skills, the Matt Pocock skills, frontend-design, ui-taste, ios-design, web-design-guidelines, caveman, caveman-commit, agent-browser, ponytail, shadcn-svelte and seo-audit. `sv add ai-tools` already put the Svelte skills in `.claude/skills/`. Run `npx skills update -p -y` only if the user wants the latest upstream versions instead of the pinned ones.

## 10. graphify

1. If `graphify --version` fails: `uv tool install graphifyy` (needs uv: on Windows `winget install astral-sh.uv`), then `uv tool update-shell` if the command still isn't found.
2. `graphify install --project` registers the skill and hooks in this repo.
3. `graphify hook install` rebuilds the graph on commit and checkout.
4. Copy `<skill>/templates/.graphifyignore` to the app root, so installed skills stay out of the graph.
5. `graphify update .` builds the first graph (AST only, no API cost).

## 11. CLAUDE.md and CHANGELOG.md

1. Copy `<skill>/templates/CLAUDE.md` to the app root as `CLAUDE.md` and replace `{{APP_NAME}}`. Without better-auth, drop better-auth and CASL from the overview line, along with the sentence about the `post` example. Keep the rules.
   `sv` also wrote `AGENTS.md` and `.claude/CLAUDE.md` (which imports `AGENTS.md`). Leave both: they hold the Svelte MCP instructions.
2. Copy `<skill>/templates/CHANGELOG.md` and replace `{{DATE}}` with today's date.
3. Add `.claude/worktrees/` to `.gitignore`. Exclude it from Playwright (`testIgnore`) and from the Vite watcher (`server.watch.ignored`).

## 12. Matt Pocock skills config

Read `.claude/skills/setup-matt-pocock-skills/SKILL.md` and follow it, but don't ask the user anything; use these answers:

- **Issue tracker**: local markdown. Issues are files under `.scratch/<feature>/` in this repo. Use that skill's `issue-tracker-local.md` seed.
- **Triage labels**: default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
- **Domain docs**: single-context. One `GLOSSARY.md` and `docs/adr/` at the repo root.

It writes `docs/agents/*.md` and adds an `## Agent skills` block to the root `CLAUDE.md` from step 11. Also create an empty `GLOSSARY.md` (title + one line) and `docs/adr/.gitkeep`.

## 13. Checks and commits

1. Compile Paraglide messages first: `npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`. Otherwise `#lib/paraglide/*` imports don't resolve until Vite has run once. Then run `npm run format`, `npm run lint` and `npm run check`, and fix anything they report.
2. Commit in logical groups (one commit per reason: add-ons, database + auth scaffold, UI setup, skills + graphify, agent docs). No AI attribution in these commit messages: the project's own `CLAUDE.md` forbids it.

## 14. Report

Tell the user:

- What was installed, the database name, and which steps were skipped and why.
- With better-auth: set the `FARAZSMS_*` variables and approve the verification-code pattern (variable `code`) in the FarazSMS panel before production. In dev, codes are printed to the server console.
- Next: `npm run dev`. Run `/graphify .` once if they want the full semantic graph on top of the AST one.
