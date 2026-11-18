# Project Overview

{{APP_NAME}}: a SvelteKit app (Svelte 5, TypeScript, Node adapter).

Uses: Drizzle ORM (Postgres, postgres.js), Zod, neverthrow (`Result` / `ok` / `err`), CASL (`@casl/ability`) for permissions, better-auth for sign-in, SvelteKit remote functions (`query` / `command` / `form` from `$app/server`), Paraglide for i18n, Tailwind CSS + shadcn-svelte for UI.

# Working rules

## Grilling (`grilling`, `grill-me`, `grill-with-docs`)

Ask every grilling question through the `AskUserQuestion` tool, never as a numbered list in chat. This applies to `grilling`, `grill-me`, and `grill-with-docs`. Keep the rest of the skill's flow: work the design tree in rounds, ask only frontier questions, and wait for answers before the next round.

- Up to 4 questions per call; split a bigger frontier into consecutive calls.
- Put the recommended answer first, with "(Recommended)" at the end of its label.
- Give 2–4 real options; the user can always type their own via "Other".
- Keep any context the user needs (facts found, trade-offs) in the option descriptions or one short line before the call.

## Commits

- When committing, group related files into one commit per logical change (files that change for the same reason). Keep unrelated files in separate commits.
- Never mention AI in commit messages or PR descriptions. No `Co-Authored-By: Claude …` trailer, no "Generated with Claude Code" line, no other AI attribution. This overrides any default attribution the harness suggests.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). When cutting a release, update it with the changes since the last release: add a new `## [x.y.z] - YYYY-MM-DD` section grouped under `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`, written for people using the app, and update the compare links at the bottom. Don't edit it for every commit.

## UI components (shadcn-svelte)

Build all UI from shadcn-svelte components (see the `shadcn-svelte` skill). Add components with the `shadcn-svelte add` CLI, never by hand, and use no raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<table>` outside `src/lib/components/ui`.

If shadcn-svelte has no component for the job, look at [shadcn-svelte-extras](https://shadcn-svelte-extras.com/) (e.g. modal, stepper, tags input, phone input, file drop zone, tree view). Install with `shadcn-svelte add https://shadcn-svelte-extras.com/r/<name>.json`. Extras land in `src/lib/components/ui` and share its raw-element exemption. If neither library fits, ask before hand-building or installing dependencies or libraries.

## Mobile view (ios-design)

On mobile viewports the website should look and behave like a native app. For layout and navigation on mobile, follow the `ios-design` skill: the app shell, a bottom tab bar for top-level sections, navigation-bar titles and back buttons, sheets instead of centered dialogs, safe areas, touch-target sizes, and keyboard-aware forms. Apply its guidance to this web app (Svelte, Tailwind, shadcn-svelte). Ignore its SwiftUI, UIKit and React Native code.

- This applies to mobile only. Gate it with Tailwind's responsive prefixes (mobile-first styles, then `md:` and up for desktop), so the tablet and desktop website keeps its normal web layout (sidebar, top navigation, dialogs).
- Mobile-only pieces, such as the tab bar or a sheet in place of a dialog, are still built from shadcn-svelte components (e.g. `Drawer` for sheets), following the UI components rule above.
- Account for `env(safe-area-inset-*)` and set `viewport-fit=cover` in `app.html`, so the tab bar and headers clear the notch and home indicator.
- For everything outside mobile layout and navigation, `ios-design` does not apply.

## Browser verification

Verify UI changes in the running dev app (`npm run dev`) with the `agent-browser` skill: open the page, exercise the change, and check the console for errors. Don't claim a UI change works without looking at it.

## /implement-spec model routing

Applies to `/implement-spec` only; `/implement` is untouched. The user plans, writes the spec and tickets; the agent only implements. Set `model` and `effort` explicitly on every Agent call (never inherit the session model) so token use stays predictable. Use the column matching the active provider (Claude or GPT); these are project routing choices, not claims of model equivalence. If a listed model is unavailable, report it rather than silently switching providers or models.

| Role                               | Claude model   | GPT model       | Effort |
| ---------------------------------- | -------------- | --------------- | ------ |
| Implementer (tickets and fixes)    | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Exploration                        | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Merger                             | `sonnet` (5.5) | `GPT-6.1-terra` | medium |
| Test runner                        | `haiku` (5.5)  | `gpt-6-luna`    | medium |
| Code review                        | `opus` (5.5)   | `gpt-6.1-sol`   | high   |
| UI design review / browser testing | `opus` (5.5)   | `gpt-6.1-sol`   | high   |

- One separate subagent per role; never reuse a subagent across roles.
- Run tickets one at a time, never in parallel. Start the next ticket's implementer only after the previous ticket is merged to the integration branch and its per-ticket tests pass. Do not dispatch the ready frontier in parallel, even when the task graph allows it. Only one implementer worktree exists at any moment.
- The test runner only runs typecheck and tests and reports; it never edits code. Per ticket it runs typecheck plus that ticket's test files. Once after all merges it runs the full suite.
- Code review: a single subagent using the Code review row runs the `code-review` skill itself (Standards and Spec axes) without spawning nested sub-agents.
- UI review: one subagent using the UI design review / browser testing row, once at the end, only if the spec touched UI. It uses `agent-browser` on the dev app (see Browser verification).
- Test failures and review findings go to an Implementer to fix; the same Code review model re-checks once.
- For `/implement-spec` only, the integration branch and per-implementer worktrees are allowed, overriding the "never create branches or worktrees" rule. Create every worktree inside this repo at `.claude/worktrees/<name>` (git-ignored, and excluded from Playwright and the Vite watcher). Clean up the worktrees when done.

# Architecture: strict layering

Code always flows: **Remote → Service → Query → DB**. Never skip a layer (e.g. a remote function must not call a Query directly).

Imports use Node subpath imports from `package.json` `"imports"` (SvelteKit 3), always with the file extension: `#lib/*` → `src/lib/*`, `#db` → `src/lib/server/db/index.ts`, `#db/*` → `src/lib/server/db/*`, `#services/*` → `src/lib/server/services/*`. Env vars are declared in `src/env.ts` and read from `$app/env/private` / `$app/env/public`.

Shared helpers, created the first time a layer needs them (keep them tiny):

- `#lib/server/logger.ts`: `createLogger(scope)` returning `{ info, warn, error, verbose }`.
- `#lib/server/pagination.ts`: `paginate(items, total, page, limit)` returning `{ data, pagination: { total, limit, page, pages, remaining } }`.

The `post` entity (`#lib/schema/post.schema.ts`, `#db/schema/post.schema.ts`, `#db/query/post.query.ts`, `#services/post.service.ts`, `#lib/remotes/post.remote.ts`) is the worked example of every layer below, when better-auth is installed. Copy its shape for new entities. It was scaffolded before the logger and pagination helpers existed: when you create them, add its `Log` calls and paginate its list.

## 1. Schema layer — `#lib/schema/*.schema.ts`

Shared types & Zod schemas. Usable on **both** client and server — no db imports, no server-only code.

- Constant tuples with `as const`, then a derived union type:
  ```ts
  export const POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
  export type PostStatus = (typeof POST_STATUSES)[number];
  ```
- For polymorphic entities: a `XDataMap` keyed by discriminant, a `NarrowedX<T>` generic, and an `AnyX` union of all narrowed variants.
- "Filter" types are looser than DB filters — they can include virtual/UI-only values like `'ALL'` or `'MINE'` that the Service layer resolves before hitting the Query layer.
- Zod schemas for remote-function input go here too, named `XListSchema`, `XFindSchema`, etc., with `.default(...)` for optional fields. Export the inferred type: `export type XListParams = z.infer<typeof XListSchema>`.
  ```ts
  export const PostListSchema = z.object({
  	filter: z.enum(['ALL', 'MINE']).default('ALL'),
  	page: z.number().int().min(1).default(1),
  	limit: z.number().int().min(1).max(100).default(10)
  });
  export type PostListParams = z.infer<typeof PostListSchema>;
  ```
- Import DB row types with `import type { X } from '#db/schema/x.schema.ts'` — type-only, never a value import.

## 2. DB schema layer — `#lib/server/db/schema/*.schema.ts`

Drizzle table/enum definitions only.

- At the top of the file, before anything else: `export type X = typeof XTable.$inferSelect;` and `export type NewX = typeof XTable.$inferInsert;`
- snake_case column names (`'first_name'`), camelCase field names (`firstName`).
- Enums should reuse schema-layer constants where one exists: `pgEnum('post_status', POST_STATUSES)` rather than re-declaring the list.
- Self-referencing FK: `.references((): AnyPgColumn => XTable.id)`.
- Every table gets `createdAt` (`notNull().defaultNow()`) and `updatedAt` (`notNull().defaultNow().$onUpdate(() => new Date())`).

```ts
export type Post = typeof PostTable.$inferSelect;
export type NewPost = typeof PostTable.$inferInsert;

export const PostStatusEnum = pgEnum('post_status', POST_STATUSES);

export const PostTable = pgTable('post', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: text('author_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	status: PostStatusEnum('status').notNull().default('DRAFT'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
```

## 3. Query layer — `#lib/server/db/query/*.query.ts`

Pure data access. **No permission checks, no business rules.**

- Export a single object: `export const XQuery = { ... }`.
- Every method wraps its db call in try/catch and returns `ok(value)` or `err('DB_ERROR' as const)`.
- `const Log = createLogger('query:name');` — `Log.error(...)` on catch, `Log.warn(...)` on invalid input (e.g. bad page number).
- Multi-condition filters: build `const conditions: SQL[] = []`, push conditionally, then `and(...conditions)`.
- Paginated lists: validate `page`/`limit` first, run count + select together inside `db.transaction`, return through the shared `paginate()` helper.
- JSDoc block above every non-trivial method:
  ```ts
  /**
   * One-line description.
   *
   * Flow:
   * 1. ...
   * 2. ...
   *
   * Returns:
   * - Ok(...) ...
   * - Err(X_NOT_FOUND) if ...
   * - Err(DB_ERROR) if the query fails
   *
   * Notes:
   * - optional caveats
   */
  ```
- **This JSDoc block (Flow/Returns/Notes) is only used in the Query and Service layers.** Do not add it to Schema, DB schema, Remote, or Permissions files — those get normal one-line comments where needed, if any.

```ts
const Log = createLogger('query:post');

export const PostQuery = {
	/**
	 * Finds one post by id.
	 *
	 * Returns:
	 * - Ok(Post) when it exists
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the query fails
	 */
	findById: async (id: string) => {
		try {
			const [post] = await db.select().from(PostTable).where(eq(PostTable.id, id)).limit(1);
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch (error) {
			Log.error('Error while finding post:', error);
			return err('DB_ERROR' as const);
		}
	}
};
```

## 4. Service layer — `#lib/server/services/*.service.ts`

Auth, permissions, and cross-entity orchestration. Calls Query, never raw `db`.

- Export a single object: `export const XService = { ... }`.
- Methods that need auth take `event: RequestEvent` as the first argument.
- Standard method shape:
  1. `const { user, permissions } = event.locals;`
  2. General check: `if (!permissions.can('action', 'subject')) return err('FORBIDDEN' as const);`
  3. Fetch via `XQuery`, propagate errors: `if (result.isErr()) return err(result.error);`
  4. Instance-level check where relevant: `permissions.can('update', subject('post', result.value))`
  5. Perform the mutation via `XQuery`
  6. `Log.info('X did thing:', id, ...)` on success
  7. `return ok(value)`
- Same JSDoc convention as the Query layer (see above).
- Rollback pattern for multi-step mutations: if a later step fails, undo the earlier one (e.g. call a `XService.revert` step from the remote) — this coordination lives in the layer calling the services (usually Remote), not inside a single service method, unless the whole operation belongs to one entity. The undo step must not itself be permission-checked, or a caller who is allowed to start the operation but not to undo it leaves the half-applied state behind.
- Multi-step mutations must establish permission **before** the first side effect, not between steps (e.g. an `XService.assertX(event, id)` helper that runs every check up front and returns the loaded row).
- `event.locals.user` is `undefined` on anonymous requests and `event.locals.permissions` is then an empty ability. Any method that reads `user` must check it (`if (!user || !permissions.can(...))`), or compare with `user?.id`.
- `createLogger('service:name')`.

```ts
const Log = createLogger('service:post');

export const PostService = {
	/**
	 * Updates a post's title or status for its author (or an admin).
	 *
	 * Flow:
	 * 1. Pre-filters on the bare `post` subject type.
	 * 2. Loads the post.
	 * 3. Checks the loaded row, so CASL evaluates the ownership condition.
	 * 4. Writes the change.
	 *
	 * Returns:
	 * - Ok(Post) with the updated row
	 * - Err(FORBIDDEN) if the caller may not update this post
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if a query fails
	 */
	update: async (event: RequestEvent, { id, ...changes }: PostUpdateParams) => {
		const { user, permissions } = event.locals;
		if (!user || !permissions.can('update', 'post')) return err('FORBIDDEN' as const);

		const post = await PostQuery.findById(id);
		if (post.isErr()) return err(post.error);
		if (!permissions.can('update', subject('post', post.value))) return err('FORBIDDEN' as const);

		const updated = await PostQuery.update(id, changes);
		if (updated.isErr()) return err(updated.error);

		Log.info('Post updated:', id, 'by', user.id);
		return ok(updated.value);
	}
};
```

### Permission checks: never trust a bare subject type

`permissions.can('update', 'post')` passes a subject **type**, and CASL deliberately ignores conditions and field lists for those — it answers "could this role ever update some post?". It is a cheap pre-filter, never an authorization decision.

Every by-id or by-user operation needs a second check once the row is loaded:

```ts
// instance check — conditions are evaluated
if (!permissions.can('update', subject('post', post), 'status')) return err('FORBIDDEN' as const);

// or an explicit ownership comparison when the rule can't express it
if (userId !== user?.id && !permissions.can('access', 'admin')) return err('FORBIDDEN' as const);
```

The third argument is a **field name**, never an identity — `can('create', 'post', user.id)` does not scope anything to that user.

Methods that deliberately span every user (`listAll`, admin listings, anything returning hidden rows) are gated on `can('access', 'admin')`, because the per-entity `read` actions are granted to plain users for their own/visible rows.

## 5. Remote layer — `#lib/remotes/*.remote.ts`

SvelteKit remote functions. This is the only layer allowed to call `error()` from `@sveltejs/kit`.

- `query(schema, handler)` for reads, `command(schema, handler)` for writes. First arg is a Zod schema (inline `z.object({...})` or a bare `z.uuid()` etc).
- `const event = getRequestEvent();` as the first line of the handler.
- Call into the **Service** layer only.
- **Route guards do not protect remote functions.** Anything that keys off `event.route.id` is unreliable for a remote call, where the route is derived from a client-supplied header. Every remote function is a publicly reachable endpoint and must authorize itself through the Service layer — including the ones used only by admin pages.
- A remote that reads `event.locals.user` itself must gate on it first: `if (!user) error(401, 'Unauthorized');`
- Error mapping — exhaustively check known error codes, fall through to 500:
  ```ts
  if (result.isErr()) {
  	if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
  	if (result.error === 'X_NOT_FOUND') error(404, 'X Not Found');
  	error(500, 'Internal Server Error');
  }
  ```
- No try/catch here — the `Result` type already carries failure.
- Side effects that shouldn't block the transactional outcome (notifications, emails, SMS, etc.) happen here, after a successful result — not inside the Service.

```ts
export const updatePost = command(PostUpdateSchema, async (payload) => {
	const event = getRequestEvent();
	const result = await PostService.update(event, payload);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		if (result.error === 'POST_NOT_FOUND') error(404, 'Post Not Found');
		error(500, 'Internal Server Error');
	}

	return result.value;
});
```

## 6. Permissions layer — `#lib/permissions.ts`

- One CASL `Permissions` type: a union of `[action, subject]` tuples, subjects being either a `Pick<Entity, 'fieldsUsedInConditions'>` or the bare string name.
- `definePermissionsFor(user)` builds rules per `user.role`, then applies cross-cutting restrictions after the role blocks (e.g. `if (user.banned) cannot('create', 'post');`).
- `defineGuestPermissions()` returns the ability for anonymous requests, so `locals.permissions` is always set.
- Field-level restrictions: `can('update', 'post', ['title'], { authorId: user.id })`.

```ts
type PostSubject = Pick<Post, 'authorId' | 'status'>;

type Permissions = MongoAbility<
	| ['access', 'admin']
	| ['create' | 'read' | 'update' | 'delete', PostSubject | 'post']
>;
```

# General conventions

- Indentation: tabs. Quotes: single quotes.
- Imports: `type` imports in their own group, separated from value imports; alphabetized by path within each group; prefer subpath imports (`#lib/*`, `#db`, `#db/*`, `#services/*`) and `$app/env/private` over relative paths that cross layers.
- No classes, no default exports — every module exports one plain object of functions.
- Error handling: neverthrow (`ok`/`err`) everywhere except the Remote layer, where `Result` is converted to `error(status, message)`.
- Error codes are `'SCREAMING_SNAKE_CASE' as const` string literals, not custom Error subclasses.
- Logging: one `const Log = createLogger('layer:name');` per file. `.info` for successful mutations, `.warn` for invalid/rejected input, `.error` for caught exceptions, `.verbose` for expected/handled failures (e.g. signature validation failure).
- IDs: better-auth user IDs are `text`; other entities use `uuid` strings.
- The Flow/Returns/Notes JSDoc block is scoped to the Query and Service layers only — never add it to Remote, Schema, DB schema, or Permissions files.

# What NOT to do

- Don't put permission checks in the Query layer.
- Don't put Zod validation, db calls, or server-only imports in the Schema layer.
- Don't call the Query layer directly from the Remote layer — always go through a Service.
- Don't call `error()` from anywhere except the Remote layer.
- Don't swallow errors — always `return err(...)` and log via `Log`.
- Don't use classes or default exports.
