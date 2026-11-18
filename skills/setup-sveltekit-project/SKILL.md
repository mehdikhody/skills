---
name: setup-sveltekit-project
description: Scaffold a new SvelteKit app with my standard stack (sv add-ons, Drizzle with Postgres/MySQL/SQLite on Docker Desktop or a custom URL, optional better-auth with a choice of sign-in methods including phone OTP over FarazSMS, Paraglide, shadcn-svelte), my skill group, graphify, the Matt Pocock skills config and my CLAUDE.md rules. Use when the user wants to start, create, bootstrap or scaffold a new SvelteKit project or app.
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

7. **Sign-in method** (only if better-auth is yes). Every option also gets CASL permissions and the `post` example:
   - **Username + password + phone OTP** (default): sign in with username and password, then an always-on SMS code to the phone. The phone is required and verified at signup.
   - **Phone + password**: sign in with phone and password. The phone is verified by SMS code at signup; there's no second step at sign-in.
   - **Phone OTP only**: passwordless. Each sign-in sends an SMS code, and the first verified code creates the account.
   - **Email + password**: better-auth's default. No phone and no SMS.
   If the user types another method via "Other", build it from the closest variant in step 6 and say what you changed.

SMS always goes through FarazSMS, with a console transport in dev.

**Project directory and name**

- The project directory is the current directory or the custom path. All later commands run inside it.
- **App name** = the directory's base name, converted to kebab-case: lowercase, and every run of characters other than `a-z` and `0-9` becomes `-`, trimmed of leading and trailing `-`. It is the `package.json` name, and the database name is the app name with `-` replaced by `_`. Don't ask for a name.
- If the directory exists and holds anything other than `.git`, stop and ask whether to continue there. Never delete files to make room.

## 2. Create the app

From inside the project directory:

```sh
npx sv create . --template minimal --types ts --no-add-ons --install npm
```

Then set `"name"` in `package.json` to the app name. Initialise git unless the directory already is a repo (`git init -b main`), then `git add -A && git commit -m "Create SvelteKit app"`.

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

Add `@casl/ability` only when better-auth was chosen.

## 4. Database (only with drizzle)

Write `DATABASE_URL` to `.env` (git-ignored):

- **SQLite**: `DATABASE_URL="local.db"`.
- **Custom URL**: the URL the user gave, unchanged.
- **Docker Desktop**: create the database in the user's running container. Don't ask for credentials; find them:
  1. `docker ps --format "{{.Names}} {{.Image}} {{.Ports}}"`: pick the running container whose image is `postgres*` (PostgreSQL) or `mysql*`/`mariadb*` (MySQL). If none is running, stop and ask the user to start one or give a custom URL.
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
- Keep sv's `src/lib/server/db/index.ts`, which already uses the chosen driver. Only change its schema import to `import * as schema from './schema/index.ts';`.
- Without better-auth, create `src/lib/server/db/schema/index.ts` as an empty barrel (`export {};`) for future entities.

## 6. better-auth + permissions + example entity (only with better-auth)

Copy everything under `<skill>/templates/auth/` into the app, keeping paths and overwriting what `sv` generated. The templates are written for **PostgreSQL + Username + password + phone OTP**. Adapt them for the other answers as described below.

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
| `src/lib/server/db/schema/index.ts`, `db/schema/post.schema.ts` | table barrel and the `post` table |
| `src/lib/server/db/query/post.query.ts` | Query layer example |
| `src/lib/server/services/post.service.ts` | Service layer example (type + instance permission checks) |
| `src/lib/remotes/post.remote.ts` | Remote layer example |

### Database variants

The base templates are written for PostgreSQL. For the others, copy the variant files on top of them (all paths are kept):

- **MySQL**: copy `<skill>/templates/variants/mysql/`. Its `post.schema.ts` uses `mysql-core`, and `post.query.ts` reads rows back inside transactions, because MySQL has no `RETURNING`.
- **SQLite**: copy `<skill>/templates/variants/sqlite/`. Only `post.schema.ts` uses `sqlite-core`; the base query file works as is.

Every `auth.ts` template says `drizzleAdapter(db, { provider: 'pg' })`. Set the provider to `'mysql'` or `'sqlite'` to match what sv generated.

For MySQL or SQLite, also edit the new project's `CLAUDE.md` (step 11):
- In the overview line, name the right database.
- In the DB schema layer, swap `pgEnum`/`AnyPgColumn`/`uuid` for the dialect's equivalents, taking them from the variant `post.schema.ts`.
- In General conventions, fix the IDs line.

### Sign-in method variants

The base `auth.ts` and `auth-client.ts` are **Username + password + phone OTP**. For the other methods, copy the variant folder on top of the base templates. Each `auth.ts` starts with a comment that describes its client flows.

- **Username + password + phone OTP**: base templates only.
- **Phone + password**: `<skill>/templates/variants/auth-phone-password/`. Phone + password sign-in (`signIn.phoneNumber`). The phone is verified by SMS at signup, and an unverified phone can't sign in (`requireVerification`). There's no second step at sign-in.
- **Phone OTP only**: `<skill>/templates/variants/auth-phone-otp/`. Passwordless: `phoneNumber.sendOtp` + `phoneNumber.verify`, and the first verify creates the account (`signUpOnVerification` with a placeholder email).
- **Email + password**: `<skill>/templates/variants/auth-email-password/`. No plugins. Its `src/env.ts` has no SMS variables. Delete `src/lib/phone-number.ts` and `src/lib/server/sms/` after copying, and skip the `.env.example` SMS block below. `role`, the permissions and the `post` example stay.

Then:

1. With a phone method, append to `.env.example`:
   ```sh
   # How SMS is sent: console (development default; codes are logged) | farazsms (production default)
   # SMS_TRANSPORT=console

   # FarazSMS (IranPayamak) pattern sending; every pattern must be approved in the FarazSMS panel.
   # FARAZSMS_API_KEY=
   # FARAZSMS_LINE_NUMBER=
   # FARAZSMS_PATTERN_VERIFICATION_CODE=   # one variable: code
   ```
2. `npx svelte-kit sync` (the auth CLI needs the generated `$app/tsconfig`), then `npm run auth:schema` to regenerate `db/schema/auth.schema.ts` with the columns of the chosen plugins (username, phone, twoFactor) and `role`.

## 7. Database schema push (only with drizzle)

`npm run db:push`. If it prompts, the database is new, so accept creating every table.

## 8. shadcn-svelte

Run init with every path and alias given, so its only question is the final "overwrite the CSS variables in `layout.css`?" (default **Yes**). That prompt needs a real terminal, so pipe an Enter into it every 2 seconds until init exits:

```sh
(for i in $(seq 1 90); do sleep 2; printf '\r'; done) | timeout 200 npx -y shadcn-svelte@latest init --preset b1f2J64kkE --css src/routes/layout.css --lib-alias "#lib" --components-alias "#lib/components" --utils-alias "#lib/utils" --hooks-alias "#lib/hooks" --ui-alias "#lib/components/ui"
```

Run it in the shell; don't hand it to the user. It's done when the output ends with "Project initialization completed" and `components.json` exists. If it times out instead, run it once more the same way before reporting a failure. Then `npm ci`.

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
   The template's `## Mobile view (ios-design)` section is the **Mobile only** answer from step 1. For **Desktop too**, replace that whole section (its heading and all its bullets) with the block below:
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
2. Commit in logical groups (one commit per reason: add-ons, database + auth scaffold, UI setup, skills + graphify, agent docs). No AI attribution in these commit messages: the project's own `CLAUDE.md` forbids it.

## 14. Report

Tell the user:

- What was installed, the database name, and which steps were skipped and why.
- With a phone sign-in method: set the `FARAZSMS_*` variables and approve the verification-code pattern (variable `code`) in the FarazSMS panel before production. In dev, codes are printed to the server console.
- Next: `npm run dev`. Run `/graphify .` once if they want the full semantic graph on top of the AST one.
