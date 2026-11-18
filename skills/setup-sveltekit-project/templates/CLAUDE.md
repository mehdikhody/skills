# Project Overview

{{APP_NAME}}: a SvelteKit app (Svelte 5, TypeScript, Node adapter).

Uses:
- Drizzle ORM with PostgreSQL (postgres.js) <!-- @if db-postgresql -->
- Drizzle ORM with MySQL (mysql2) <!-- @if db-mysql -->
- Drizzle ORM with SQLite (better-sqlite3) <!-- @if db-sqlite -->
- better-auth for sign-in: username + password, then an always-on SMS code (twoFactor) <!-- @if login-username -->
- better-auth for sign-in: phone number + password, phone verified by SMS at signup <!-- @if login-phone-password -->
- better-auth for sign-in: passwordless SMS codes to the phone <!-- @if login-phone-otp -->
- better-auth for sign-in: email + password <!-- @if login-email -->
- FarazSMS for SMS: `OTPService` (`#services/otp.service.ts`) sends codes through `FarazsmsService` (`#services/farazsms.service.ts`); codes are logged in dev <!-- @if phone -->
- CASL (`@casl/ability`) for permissions, with roles hard-coded in `#lib/permissions.ts` <!-- @if roles-hardcoded -->
- CASL (`@casl/ability`) for permissions, with roles and their rules stored in the `role` / `role_permission` tables <!-- @if roles-db -->
- Zod, neverthrow (`Result` / `ok` / `err`)
- SvelteKit remote functions (`query` / `command` / `form` from `$app/server`)
- Paraglide for i18n, Tailwind CSS + shadcn-svelte for UI

@docs/agents/rules.md

Before writing, editing or reviewing any code under `src/`, read `docs/agents/architecture.md`: it holds this app's layering (Remote → Service → Query → DB), file layout, naming and error-handling rules.
