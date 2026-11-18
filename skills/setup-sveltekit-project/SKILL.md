---
name: setup-sveltekit-project
description: Scaffold a new SvelteKit app with my standard stack (sv add-ons, Drizzle with Postgres/MySQL/SQLite on Docker Desktop or a custom URL, optional better-auth with a choice of sign-in methods (SMS over FarazSMS) and optional hard-coded or database roles, one file per table and per hook, Paraglide, shadcn-svelte), my skill group, graphify, the Matt Pocock skills config, my working rules in docs/agents/rules.md (imported from CLAUDE.md) and my layered architecture in docs/agents/architecture.md. Use when the user wants to start, create, bootstrap or scaffold a new SvelteKit project or app.
disable-model-invocation: true
---

# Setup SvelteKit project

Creates a new SvelteKit 3 app end to end. Files this skill ships live next to this `SKILL.md`; below, `<skill>` means this skill's folder.

Work through the steps in order. Ask the user only the questions listed in step 1 (through `AskUserQuestion`, recommended option first); decide everything else from this file. Keep a task list. Stop and report if a command fails; never skip a step silently.

## 1. Ask up front

Ask in rounds through `AskUserQuestion`, at most 4 questions per call. A question that depends on an earlier answer waits for the next round, and a question whose condition isn't met is skipped. Skip any question the user's message already answered.

**Round 1**

1. **Where to create the project?**
   - **Current directory** (default): the app is created right here (`sv create .`).
   - **Custom path**: the user types a path (via "Other"). It can be relative or absolute, and it is created if missing.
2. **Database?** Drizzle ORM with:
   - **PostgreSQL** (default), client `postgres.js`
   - **MySQL**, client `mysql2`
   - **SQLite**, client `better-sqlite3` (a local file)
   - **None**: no database. better-auth then isn't offered, because it needs one.
3. **Paraglide base locale**: `fa` (then `en`) or `en` (then `fa`). Default `fa`.
4. **ios-design on desktop too?** On mobile the site always gets an app-like layout following the `ios-design` skill (tab bar, navigation bar, sheets). Should desktop use it as well?
   - **Mobile only** (default): desktop keeps a normal web layout (sidebar, top navigation, dialogs).
   - **Desktop too**: the whole site is app-like, with the layout adapted for wide screens (iPadOS/macOS style).

**Round 2**

5. **Database connection** (PostgreSQL or MySQL only):
   - **Docker Desktop** (default): use the running Postgres/MySQL container, create the database in it and write the URL yourself (step 4).
   - **Custom URL**: the user types the connection URL (via "Other"). Write it to `.env` as is; don't create the database.
   For SQLite, don't ask: use `DATABASE_URL="local.db"` and add `local.db` to `.gitignore`.
6. **better-auth?** (only with a database) Default yes.

**Round 3**

7. **Sign-in method** (only if better-auth is yes). Every option also gets the `post` example and server-side auth flows (`AuthService` + `auth.remote.ts`):
   - **Username + password + phone OTP** (default): sign in with username and password, then an always-on SMS code to the phone. The phone is required and verified at signup.
   - **Phone + password**: sign in with phone and password. The phone is verified by SMS code at signup; there's no second step at sign-in.
   - **Phone OTP only**: passwordless. Each sign-in sends an SMS code, and the first verified code creates the account.
   - **Email + password**: better-auth's default. No phone and no SMS.
   If the user types another method via "Other", build it from the closest option in step 5 and say what you changed.
8. **Roles and permissions?** (only if better-auth is yes)
   - **Hard-coded roles** (default): `USER_ROLES` in code, a `role` enum column on the user, and CASL rules per role in `#lib/permissions.ts`.
   - **Database roles**: `role` and `role_permission` tables. Each role's CASL rules are stored as rows, loaded per request (cached), and seeded with `GUEST`, `USER` and `ADMIN` on first start.
   - **No**: no roles and no `@casl/ability`. Services check sign-in and ownership directly.

SMS always goes through FarazSMS, with a console transport in dev.

**Project directory and name**

- The project directory is the current directory or the custom path. All later commands run inside it.
- **App name** = the directory's base name, converted to kebab-case: lowercase, and every run of characters other than `a-z` and `0-9` becomes `-`, trimmed of leading and trailing `-`. It is the `package.json` name, and the database name is the app name with `-` replaced by `_`. Don't ask for a name.
- If the directory exists and holds anything other than `.git` and this skill's own install (`.agents/`, `.claude/`, `skills-lock.json`), stop and ask whether to continue there. Never delete files to make room.

## 2. Create the app

From inside the project directory:

```sh
npx sv create . --template minimal --types ts --no-add-ons --install npm
```

If the directory already holds this skill's install (`.agents/`, `.claude/`, `skills-lock.json`), run the same command with `.sv-create` in place of `.`, move everything from `.sv-create/` up into the project directory (no names collide), and delete the empty `.sv-create/`.

Then set `"name"` in `package.json` to the app name. Initialise git unless the directory already is a repo (`git init -b main`), then `git add -A -- . ':!.agents' ':!.claude' ':!skills-lock.json' && git commit -m "Create SvelteKit app"`. The skill's own files are committed with the skills in step 13.

## 3. Add-ons

Run one `sv add` with every chosen add-on. Each option is set explicitly so nothing prompts:

```sh
npx sv add --no-git-check --install npm \
  "ai-tools=ide:claude-code+delivery:tools+tools:mcp,svelte-code-writer,svelte-core-bestpractices,svelte-file-editor+mcpSetup:local+agentsMd:yes+optInSkills:none" \
  "drizzle=<drizzle options>" \
  eslint prettier "playwright=demo:no" "tailwindcss=plugins:none" "vitest=usages:unit,component" \
  "paraglide=languageTags:<base>,<other>+demo:no" \
  "sveltekit-adapter=adapter:node" \
  "better-auth=demo:none" \
  enhanced-img mdsvex "experimental=features:async,remoteFunctions"
```

- `<drizzle options>` per database:
  - PostgreSQL: `database:postgresql+postgresql:postgres.js+docker:no`
  - MySQL: `database:mysql+mysql:mysql2+docker:no`
  - SQLite: `database:sqlite+sqlite:better-sqlite3`
- Drop the `drizzle=...` argument when the database is None, and the `better-auth=...` argument when better-auth is declined.
- `<base>,<other>` is `fa,en` or `en,fa` from step 1.
- Docker is off on purpose: sv's `docker:yes` writes a docker-compose file, but the user's databases already run in Docker Desktop (step 4).

Then install the libraries the architecture rules use. Always:

```sh
npm i neverthrow zod
```

Add `@casl/ability` only when roles and permissions were chosen (hard-coded or database).

## 4. Database (only with drizzle)

Write `DATABASE_URL` to `.env` (git-ignored):

- **SQLite**: `DATABASE_URL="local.db"`.
- **Custom URL**: the URL the user gave, unchanged.
- **Docker Desktop**: create the database in the user's running container. Don't ask for credentials; find them:
  1. `docker ps --format "{{.Names}} {{.Image}} {{.Ports}}"`: pick the running container whose image is `postgres*` (PostgreSQL) or `mysql*`/`mariadb*` (MySQL). If `docker ps` fails because the engine isn't running and Docker Desktop is installed, start it (Windows: `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`; macOS: `open -a Docker`) and retry `docker ps` for up to 2 minutes; do the other steps meanwhile. If no matching container is running, stop and ask the user to start one or give a custom URL.
  2. Read its environment with `docker inspect <container> --format "{{range .Config.Env}}{{println .}}{{end}}"`. The host port comes from the `docker ps` ports column.
     - Postgres: `POSTGRES_USER` (default `postgres`) and `POSTGRES_PASSWORD`; port usually `5432`.
     - MySQL: user `root` with `MYSQL_ROOT_PASSWORD`; port usually `3306`.
  3. Create the database (`<db_name>` = app name with `-` replaced by `_`) if it's missing:
     ```sh
     # Postgres
     docker exec <container> psql -U <user> -tc "SELECT 1 FROM pg_database WHERE datname = '<db_name>'" | grep -q 1 || docker exec <container> psql -U <user> -c "CREATE DATABASE <db_name>"
     # MySQL
     docker exec <container> mysql -uroot -p<password> -e "CREATE DATABASE IF NOT EXISTS <db_name>"
     ```
  4. The URL is `postgres://<user>:<password>@localhost:<port>/<db_name>` or `mysql://root:<password>@localhost:<port>/<db_name>`, with the password URL-encoded.

With better-auth, also set `ORIGIN="http://localhost:5173"` and `BETTER_AUTH_SECRET="<32 random bytes, base64url>"` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).

## 5. Layering scaffold

All template code is in `<skill>/templates/`. Its files carry conditional markers, and `<skill>/scripts/apply-tags.mjs` keeps or drops lines and whole files for the step 1 answers. Never edit the markers by hand.

1. **Remove what sv generated and the templates replace:**
   - `src/lib/server/db/schema.ts` (the sample `task` table) and `src/lib/server/db/auth.schema.ts`.
   - `src/lib/server/auth.ts`.
   - The `auth:schema` script in `package.json`. Auth tables are hand-written, one file each, so the better-auth CLI must not regenerate them into a single file.
2. **Copy** `<skill>/templates/app/` into the project root, overwriting. With a database, also copy `<skill>/templates/<postgresql|mysql|sqlite>/` on top.
3. **Resolve the markers** (from the project root):
   ```sh
   node <skill>/scripts/apply-tags.mjs --db <none|postgresql|mysql|sqlite> --auth <none|username|phone-password|phone-otp|email> --roles <none|hardcoded|db> src
   ```
   Map the answers as follows. Sign-in method: Username + password + phone OTP → `username`, Phone + password → `phone-password`, Phone OTP only → `phone-otp`, Email + password → `email`. Roles: Hard-coded → `hardcoded`, Database → `db`, No → `none`. No better-auth means `--auth none --roles none`.
   Then run `grep -rn "@if \|#if \|#endif\|#file-if" src --include=*.ts`: it must find nothing.
4. **Wire it up:**
   - Add the subpath imports to `package.json` `"imports"`, next to the `#lib` entries sv created:
     ```json
     "#db": "./src/lib/server/db/index.ts",
     "#db/*": "./src/lib/server/db/*",
     "#services/*": "./src/lib/server/services/*"
     ```
   - With a database:
     - In `drizzle.config.ts`, set `schema: './src/lib/server/db/schema'`, so it reads the whole folder.
     - Keep sv's `src/lib/server/db/index.ts`, which already uses the chosen driver. Only change its schema import to `import * as schema from './schema/index.ts';`.

What this gives you:

| Always | |
| --- | --- |
| `src/hooks.server.ts` | only composes hooks: `sequence(ParaglideHook, AuthHook)`; with database roles also `init` (seeds the roles) |
| `src/lib/server/hooks/paraglide.hook.ts` | locale + `lang`/`dir` in `app.html` |
| `src/app.d.ts`, `src/env.ts` | `locals` types; env vars for the database, better-auth and SMS (only those in use) |

| With better-auth | |
| --- | --- |
| `src/lib/server/hooks/auth.hook.ts` | session on `locals`; `locals.permissions` when roles are on |
| `src/lib/server/auth.ts` | better-auth with the chosen method's plugins. `drizzleAdapter` gets the right `provider` and `schema: { user: UserTable, session: SessionTable, account: AccountTable, verification: VerificationTable, twoFactor: TwoFactorTable }` |
| `src/lib/server/db/schema/{user,session,account,verification}.schema.ts` | better-auth's tables, one file each, `XTable` exports with `X`/`NewX` types; only the columns the method needs |
| `…/schema/two-factor.schema.ts` | Username method only |
| `…/schema/relations.schema.ts`, `…/schema/index.ts` | every relation in one file; a barrel of every table |
| `src/lib/server/db/query/user.query.ts` | user lookups for `AuthService` |
| `src/lib/server/services/auth.service.ts` | every sign-in flow through `auth.api.*`, with better-auth's error codes mapped to the app's own; `getCurrentUser` reloads the row |
| `src/lib/remotes/auth.remote.ts` | `form`/`command`/`query` remotes for login, the SMS code, registration and password reset (whichever the method has); field errors via `invalid`, the rest via `error` |
| `src/lib/schema/user.schema.ts` | lengths, OTP settings, roles, and the Zod schemas of the auth forms |
| `src/lib/phone-number.ts`, `src/lib/server/services/otp.service.ts`, `src/lib/server/services/farazsms.service.ts` | phone methods only: Iranian mobile normalising/masking; `OTPService` logs codes in dev or sends them through `FarazsmsService` |
| `post` schema, query, service and remote | the worked example of every layer |

| With roles | |
| --- | --- |
| `src/lib/permissions.ts` | the `Permissions` type; hard-coded: `definePermissionsFor` / `defineGuestPermissions`; database: `buildPermissions` |
| database roles only | `…/schema/role.schema.ts` (`RoleTable`, `RolePermissionTable`), `…/query/role.query.ts`, `…/services/permission.service.ts`, `#lib/schema/role.schema.ts` |

These combinations are type-checked, linted and run through `drizzle-kit generate` against fresh sv apps:
- PostgreSQL: every sign-in method × every roles option.
- MySQL and SQLite: three each.
- No auth, and no database.

## 6. Env and SMS (only with better-auth)

1. With a phone method, append to `.env.example`:
   ```sh
   # How SMS is sent: console (development default; codes are logged) | farazsms (production default)
   # SMS_TRANSPORT=console

   # FarazSMS (IranPayamak) pattern sending; every pattern must be approved in the FarazSMS panel.
   # FARAZSMS_API_KEY=
   # FARAZSMS_LINE_NUMBER=
   # FARAZSMS_PATTERN_VERIFICATION_CODE=   # one variable: code
   ```
2. `npx svelte-kit sync`.

## 7. Database schema push (only with drizzle)

sv's `drizzle.config.ts` has `strict: true`, so `npm run db:push` always asks for confirmation, and without a terminal it fails with "Interactive prompts require a TTY".

- **Docker Desktop or SQLite**: the database was just created and is empty, so push without the prompt: `npx drizzle-kit push --strict=false --verbose=false --force`. It's done when it prints `[✓] Changes applied`.
- **Custom URL**: the database may already hold data, so never pass `--force`. Run `npm run db:push` in a terminal the user can see (in the Claude desktop app, `run_in_terminal`) and ask them to review and confirm it.

With database roles, the default roles are seeded the first time the app starts (`init` in `hooks.server.ts`).

## 8. shadcn-svelte

Run init with every path and alias given, so its only question is the final "overwrite the CSS variables in `layout.css`?" (default **Yes**). That prompt needs a real terminal, so pipe an Enter into it every 2 seconds until init exits:

```sh
(for i in $(seq 1 90); do sleep 2; printf '\r'; done) | timeout 200 npx -y shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "#lib" --components-alias "#lib/components" --utils-alias "#lib/utils" --hooks-alias "#lib/hooks" --ui-alias "#lib/components/ui"
```

Run it in the shell; don't hand it to the user. It's done when the output ends with "Project initialization completed" and `components.json` exists. If it times out instead, run it once more the same way before reporting a failure. Then `npm ci`. On npm 12 and later, npm warns that esbuild's install scripts are blocked. That's harmless (Vite, the checks and the dev server all work), so don't approve them.

### Persian font (when `fa` is one of the locales)

Run this after shadcn init, because init overwrites `layout.css`:

1. `npm i vazirmatn`
2. In `src/routes/layout.css`, right after `@import 'tailwindcss';`, add `@import 'vazirmatn/Vazirmatn-Variable-font-face.css';`. This is a single variable woff2 covering weights 100–900, family name `'Vazirmatn'`.
3. The preset defines its fonts in `@theme inline` (`--font-sans` and `--font-heading`, both `'Roboto Variable', sans-serif`), so the utilities hard-code the stack and overriding the variables does nothing. The `<html lang>` comes from Paraglide, so add this unlayered rule at the end of `layout.css`. Copy the Latin fallback from the preset's `--font-sans` line in case it changes:
   ```css
   /* Persian pages: Vazirmatn first; Latin text falls back to the preset font. */
   html:lang(fa) body,
   html:lang(fa) .font-sans,
   html:lang(fa) .font-heading {
   	font-family: 'Vazirmatn', 'Roboto Variable', sans-serif;
   }
   ```
4. Check it in the browser on a `fa` page: the computed `font-family` of body text and headings starts with Vazirmatn, and on an `en` page it doesn't. sv's Paraglide strategy picks the locale from a cookie, not the URL, so `/en` still renders `fa`. To get an `en` page, set `document.cookie = 'PARAGLIDE_LOCALE=en; path=/'`, reload, and clear the cookie afterwards.

## 9. Skills

Copy `<skill>/skills-lock.json` to the app root and restore every pinned third-party skill for Claude Code. If the root already has a `skills-lock.json` (it pins this skill when the skill was installed into the project), merge instead of overwriting: keep its existing `skills` entries and add the template's.

```sh
npx skills experimental_install -a claude-code
```

This installs 38 skills into `.agents/skills/`, linked from `.claude/skills/`: find-skills, the Matt Pocock skills, frontend-design, ui-taste, ios-design, web-design-guidelines, caveman, caveman-commit, agent-browser, ponytail, shadcn-svelte and seo-audit. `sv add ai-tools` already put the Svelte skills in `.claude/skills/`. Run `npx skills update -p -y` only if the user wants the latest upstream versions instead of the pinned ones.

Then keep the installed skills away from the project's tooling:

1. **Formatter and linter.** Add `/.agents/`, `/.claude/skills/` and `/graphify-out/` to `.prettierignore`. In `eslint.config.js`, add `{ ignores: ['.agents/', '.claude/skills/', 'graphify-out/'] }` right after `includeIgnoreFile(gitignorePath)`. Without this, `npm run format` in step 13 rewrites about 150 skill files, and `npm run lint` fails on `.svelte` files inside the shadcn-svelte skill. If the format already ran, restore the skills with `npx skills experimental_install -a claude-code` and `graphify install --project`.
2. **Git.** On Windows, the links in `.claude/skills/` are junctions, and git would commit each one as a full second copy of its `.agents/skills/` folder. Add to `.gitignore`:
   ```gitignore
   # Skill links into .agents/skills; restore with: npx skills experimental_install -a claude-code
   .claude/skills/*
   !.claude/skills/graphify/
   !.claude/skills/svelte-code-writer/
   !.claude/skills/svelte-core-bestpractices/
   ```
   The un-ignored entries are real folders: the Svelte skills from `sv add ai-tools`, and graphify's skill from step 10.

## 10. graphify

1. If `graphify --version` fails: `uv tool install graphifyy` (needs uv: on Windows `winget install astral-sh.uv`), then `uv tool update-shell` if the command still isn't found.
2. `graphify install --project` registers the skill and hooks in this repo.
3. `graphify hook install` rebuilds the graph on commit and checkout.
4. Copy `<skill>/templates/.graphifyignore` to the app root, so installed skills stay out of the graph.
5. `graphify update .` builds the first graph (AST only, no API cost).

## 11. CLAUDE.md, agent rules and CHANGELOG.md

1. Copy `<skill>/templates/CLAUDE.md` to the app root, and `<skill>/templates/docs/agents/` (`rules.md` and `architecture.md`) to `docs/agents/`. graphify (step 10) has already created a root `CLAUDE.md` with a `## graphify` block: keep that block and append it after the template's content, or Claude Code stops using the graph. `CLAUDE.md` holds the stack overview, imports `rules.md` (`@docs/agents/rules.md`, loaded every session) and points to `architecture.md`, which the agent reads before it touches code under `src/`.
   Resolve the markers with the same answers as step 5: `node <skill>/scripts/apply-tags.mjs --db … --auth … --roles … CLAUDE.md docs/agents/architecture.md`. That picks the stack lines in `CLAUDE.md`, and in `architecture.md` the database's DB-schema notes, the permissions sections and the `post` sentence. Then replace `{{APP_NAME}}` in `CLAUDE.md`, and run `grep -rn "@if \|#if \|#endif\|#file-if" CLAUDE.md docs/agents`: it must find nothing.
   The `## Mobile view (ios-design)` section of `docs/agents/rules.md` is the **Mobile only** answer from step 1. For **Desktop too**, replace that whole section (its heading and all its bullets) with the block below:
   ```markdown
   ## App-like layout on every screen size (ios-design)

   The website looks and behaves like a native app on every viewport. For layout and navigation, follow the `ios-design` skill: the app shell, tab-based top-level navigation, navigation-bar titles and back buttons, sheets, safe areas, touch-target sizes, and keyboard-aware forms. Apply its guidance to this web app (Svelte, Tailwind, shadcn-svelte). Ignore its SwiftUI, UIKit and React Native code.

   - Mobile follows the iPhone patterns: a bottom tab bar, full-width content, and bottom sheets.
   - Tablet and desktop (`md:` and up) adapt the same app the way iPadOS/macOS apps do. Don't just stretch the phone layout: the tab bar becomes a sidebar, content width is capped, and sheets can become side panels or centered modals.
   - The app-like pieces (tab bar, sidebar, sheets) are built from shadcn-svelte components (e.g. `Sidebar`, `Drawer`, `Sheet`), following the UI components rule above.
   - Account for `env(safe-area-inset-*)` and set `viewport-fit=cover` in `app.html`, so the tab bar and headers clear the notch and home indicator.
   - For everything outside layout and navigation, `ios-design` does not apply.
   ```
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
2. Commit in logical groups (one commit per reason: add-ons, database + auth scaffold, UI setup, skills + graphify, agent docs). Stage each group's paths explicitly, never `git add -A`: the format run also touches files from earlier groups, and graphify can leave backup files such as `.claude/settings.json.graphify-bak` (delete those). No AI attribution in these commit messages: the project's own `docs/agents/rules.md` forbids it.
3. graphify's post-commit hook rebuilds the graph in the background after every commit. After the last commit, wait about 10 seconds and run `git status --short`. If only `graphify-out/` changed, commit it alone as "Update graphify graph", then check once more. Any other leftover is a bug in this run: report it.

## 14. Report

Tell the user:

- What was installed, the database name, and which steps were skipped and why.
- With better-auth: the auth flows are ready as remote functions in `#lib/remotes/auth.remote.ts`; the login and registration pages still need building on them.
- With database roles: the `GUEST`, `USER` and `ADMIN` roles are seeded on first start; change their rules in the `role_permission` table.
- With a phone sign-in method: set the `FARAZSMS_*` variables and approve the verification-code pattern (variable `code`) in the FarazSMS panel before production. In dev, codes are printed to the server console.
- Next: `npm run dev`. Run `/graphify .` once if they want the full semantic graph on top of the AST one.
