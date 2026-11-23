---
name: sveltekit-standards
description: Full-stack and backend working standards for SvelteKit 3 apps across any agent harness or model. Extends svelte-standards and standards with backend sv add-ons (drizzle, better-auth, adapter-node, remoteFunctions), subpath imports (#lib/*, #db, #db/*, #services/*), composed hooks, one-file-per-table Drizzle schema, server-only better-auth flows, CASL permissions, and strict 6-layer architecture (Remote -> Service -> Query -> DB). Read before writing, editing, or reviewing any SvelteKit code.
---

# SvelteKit architecture & backend standards

@.agents/skills/svelte-standards/SKILL.md

This skill extends [`svelte-standards`](../svelte-standards/SKILL.md) (and [`standards`](../standards/SKILL.md)) with SvelteKit 3 backend tooling and strict layered architecture. Follow it whenever you write, edit, or review code in a SvelteKit project.

## Backend stack & `sv` add-ons

When adding or configuring backend capabilities in a SvelteKit project:

- **`sv` add-ons**:
  - `npx sv add "sveltekit-adapter=adapter:node"`
  - `npx sv add "experimental=features:async,remoteFunctions"`
  - `npx sv add enhanced-img`
  - Database (when used): `npx sv add "drizzle=database:postgresql+postgresql:postgres.js+docker:no"`, `"drizzle=database:mysql+mysql:mysql2+docker:no"`, or `"drizzle=database:sqlite+sqlite:better-sqlite3"`
  - Auth (when used): `npx sv add "better-auth=demo:none"`
- **Core libraries**:
  - Always: `npm i neverthrow zod winston chalk lodash` and `npm i -D @types/lodash`
  - With roles/permissions (hard-coded or database): `npm i @casl/ability`
- **Subpath imports in `package.json` `"imports"`** (always imported with the `.ts` file extension):
  ```json
  "#lib": "./src/lib",
  "#lib/*": "./src/lib/*",
  "#db": "./src/lib/server/db/index.ts",
  "#db/*": "./src/lib/server/db/*",
  "#services/*": "./src/lib/server/services/*"
  ```
- **Environment variables**: declared in `src/env.ts` and read from `$app/env/private` / `$app/env/public`.

---

# Architecture: strict layering

Code always flows: **Remote → Service → Query → DB**. Never skip a layer (e.g. a remote function must not call a Query directly).

- **Hooks**: `src/hooks.server.ts` only composes hooks with `sequence(...)`. Each hook is a named `Handle` export in its own file, `#lib/server/hooks/<name>.hook.ts` (`ParaglideHook`, `AuthHook`, …). Put new request-level logic in a new hook file, not inline in `hooks.server.ts`.
- **Tables (when using Drizzle)**: one file per table in `#lib/server/db/schema/<name>.schema.ts`, all relations in `relations.schema.ts`, and every file re-exported from `schema/index.ts`. `drizzle.config.ts` sets `schema: './src/lib/server/db/schema'` so it reads the whole folder.
- **`better-auth` (when using auth)**:
  - `better-auth`'s tables (`UserTable`, `SessionTable`, `AccountTable`, `VerificationTable`, `TwoFactorTable`) are the project's own hand-written files, mapped in `#lib/server/auth.ts` (`drizzleAdapter(db, { schema: { user: UserTable, … } })`). Never run `auth generate` into them. When a `better-auth` plugin needs new columns or tables, add them by hand, using `npx auth generate --output tmp-auth.schema.ts` only as a reference, then delete that temporary file.
  - Sign-in flows run on the server only: route remotes (`src/routes/auth/login/login.remote.ts`, plus `register/` and `reset-password/` where the sign-in method has them) → `AuthService` (`#services/auth.service.ts`) → `auth.api.*`. `AuthService` maps `better-auth`'s error codes to the app's own. Components never call `better-auth` directly. Permission decisions load the user row through `AuthService.getCurrentUser` instead of trusting the session copy.
  - SMS (for phone auth flows) goes through `SmsService` (`#services/sms.service.ts`): `send` for free text, `sendPattern` for approved templates, `sendOtp` for verification codes (FarazSMS once `FARAZSMS_API_KEY` and `FARAZSMS_LINE_NUMBER` are set, otherwise logs to the server console in dev).
- **Shared helpers** (`#lib/server/logger.ts` and `#lib/server/pagination.ts`), created when first needed:

### `#lib/server/logger.ts`

Requires `winston`, `chalk`, and `lodash` (`@types/lodash`), plus `logs/` in `.gitignore`:

```ts
import type { Logger } from 'winston';
import util from 'node:util';
import chalk from 'chalk';
import _ from 'lodash';
import winston from 'winston';

const loggers = new Map<string, Logger>();

const SPLAT = Symbol.for('splat');

type AxiosLikeError = {
	isAxiosError: true;
	message: string;
	config?: { method?: string; url?: string; baseURL?: string };
	response?: { status?: number };
};

const isAxiosError = (arg: unknown): arg is AxiosLikeError =>
	typeof arg === 'object' && arg !== null && (arg as AxiosLikeError).isAxiosError === true;

/**
 * A full axios error dump carries the request's `Authorization` header (the
 * panel's bearer token) and the whole URL, which for bulk lookups is kilobytes
 * of query string. Keep just the status, method and path.
 */
const formatAxiosError = (error: AxiosLikeError) => {
	const method = error.config?.method?.toUpperCase() ?? 'REQUEST';
	let path = error.config?.url ?? '';
	try {
		path = new URL(path, error.config?.baseURL).pathname;
	} catch {
		path = path.split('?')[0];
	}
	const status = error.response?.status ?? 'no response';
	return `AxiosError ${status}: ${method} ${path} — ${error.message}`;
};

/**
 * `Log.info('foo:', bar, 'baz:', qux)` is used console.log-style throughout
 * this codebase, but winston only ever reads `info.message` (the first
 * argument) — every argument after it is stashed under the splat symbol and
 * silently dropped unless something appends it back. This joins them in,
 * the same way `console.log` would.
 */
const joinSplatArgs = winston.format((info) => {
	const splatArgs = info[SPLAT] as unknown[] | undefined;
	if (splatArgs?.length) {
		const rest = splatArgs.map((arg) => {
			if (typeof arg === 'string') return arg;
			if (isAxiosError(arg)) return formatAxiosError(arg);
			return util.inspect(arg, { depth: 4, colors: false });
		});
		info.message = [info.message, ...rest].join(' ');
	}
	return info;
});

const colorize = (level: string, message: string) => {
	const colors = {
		info: 'blue',
		error: 'red',
		warn: 'yellow',
		debug: 'cyan',
		verbose: 'white',
		http: 'magenta',
		silly: 'gray'
	};

	const color = colors[level as keyof typeof colors] || 'white';
	const colorFn = _.get(chalk, color, chalk.white);
	return colorFn(message);
};

const createConsoleTransport = () => {
	return new winston.transports.Console({
		level: process.env.LOG_LEVEL || 'silly',
		format: winston.format.combine(
			joinSplatArgs(),
			winston.format.timestamp({
				format: 'h:mm:ss A'
			}),
			winston.format.printf(({ timestamp, level, label, message }) => {
				timestamp = chalk.gray(timestamp);
				message = level === 'error' ? chalk.red(message) : message;
				label = chalk.bold.cyan(`[${label}]`);
				level = colorize(level, `[${level.toUpperCase()}]`);
				return `${timestamp} ${label}${level}: ${message}`;
			})
		)
	});
};

const createFileTransport = (name: string) => {
	return new winston.transports.File({
		level: 'info',
		filename: `logs/${_.kebabCase(name)}.log`,
		maxsize: 1000000,
		maxFiles: 1,
		format: winston.format.combine(
			joinSplatArgs(),
			winston.format.simple(),
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:m:s' }),
			winston.format.printf(({ timestamp, level, message }) => {
				return `[${timestamp}][${level}]: ${message}`;
			})
		)
	});
};

export const createLogger = (name: string) => {
	if (loggers.get(name)) {
		return loggers.get(name)!;
	}

	const logger = winston.createLogger({
		format: winston.format.label({ label: name }),
		transports: [
			// prettier-ignore
			createConsoleTransport(),
			createFileTransport(name)
		]
	});

	loggers.set(name, logger);
	return logger;
};
```

### `#lib/server/pagination.ts`

```ts
export type Pagination<T> = {
	data: T[];
	pagination: {
		total: number;
		limit: number;
		page: number;
		pages: number;
		remaining: number;
	};
};

export const paginate = <T>(items: T[], total: number, page = 1, limit = 10): Pagination<T> => {
	return {
		data: items,
		pagination: {
			total: total,
			limit: limit,
			page: page,
			pages: Math.ceil(total / limit),
			remaining: Math.max(0, total - page * limit)
		}
	};
};
```

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
- Enums reuse schema-layer constants where one exists rather than re-declaring the list:
  - PostgreSQL: `pgEnum('post_status', POST_STATUSES)`
  - MySQL: `mysqlEnum('status', POST_STATUSES)`
  - SQLite: `text('status', { enum: POST_STATUSES })`
- Database-specific rules:
  - **PostgreSQL**: self-referencing FK uses `.references((): AnyPgColumn => XTable.id)`.
  - **MySQL**: has no `RETURNING` — generate ids in code (`$defaultFn(() => crypto.randomUUID())`) and read rows back after writes; use `varchar` with a length for keyed or unique text columns; self-referencing FK uses `.references((): AnyMySqlColumn => XTable.id)`.
  - **SQLite**: dates are `integer(..., { mode: 'timestamp_ms' })`, booleans `integer(..., { mode: 'boolean' })`, JSON `text(..., { mode: 'json' })`; driver cannot run async transactions; self-referencing FK uses `.references((): AnySQLiteColumn => XTable.id)`.
- Every table gets `createdAt` (`notNull().defaultNow()`) and `updatedAt` (`notNull().defaultNow().$onUpdate(() => new Date())`).

```ts
export type Post = typeof PostTable.$inferSelect;
export type NewPost = typeof PostTable.$inferInsert;

export const PostStatusEnum = pgEnum('post_status', POST_STATUSES);

export const PostTable = pgTable('post', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: text('author_id')
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
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

Pure data access. **No permission checks, no auth or ownership checks, no business rules.**

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

Auth, permissions (or ownership checks when roles are not used), and cross-entity orchestration. Calls Query, never raw `db`.

- Export a single object: `export const XService = { ... }`.
- Methods that need auth take `event: RequestEvent` as the first argument.
- Standard method shape:
  1. With CASL permissions: `const { user, permissions } = event.locals;` (without roles: `const { user } = event.locals;`)
  2. General check:
     - With permissions: `if (!user || !permissions.can('action', 'subject')) return err('FORBIDDEN' as const);`
     - Without permissions: `if (!user) return err('FORBIDDEN' as const);`
  3. Fetch via `XQuery`, propagate errors: `if (result.isErr()) return err(result.error);`
  4. Instance-level check where relevant:
     - With permissions: `if (!permissions.can('update', subject('post', result.value))) return err('FORBIDDEN' as const);`
     - Without permissions: `if (result.value.authorId !== user.id) return err('FORBIDDEN' as const);`
  5. Perform the mutation via `XQuery`
  6. `Log.info('X did thing:', id, ...)` on success
  7. `return ok(value)`
- Same JSDoc convention as the Query layer (see above).
- Rollback pattern for multi-step mutations: if a later step fails, undo the earlier one (e.g. call an `XService.revert` step from the remote) — this coordination lives in the layer calling the services (usually Remote), not inside a single service method, unless the whole operation belongs to one entity. The undo step must not itself be permission-checked, or a caller who is allowed to start the operation but not to undo it leaves the half-applied state behind.
- Multi-step mutations must establish permission **before** the first side effect, not between steps (e.g. an `XService.assertX(event, id)` helper that runs every check up front and returns the loaded row).
- `event.locals.user` is `undefined` on anonymous requests (and with roles enabled, `event.locals.permissions` holds the guest rules). Any method that reads `user` must check it first or compare with `user?.id`.
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

## 5. Remote layer — `*.remote.ts`

SvelteKit remote functions (`query`, `command`, `form` from `$app/server`). This is the only layer allowed to call `error()` from `@sveltejs/kit`.

Where each remote function lives:

- A remote used in one place (`form`, `query` or `command`) goes in that route's directory, named after the route: `src/routes/auth/login/login.remote.ts`.
- A remote used in more than one place (several routes, or a shared component) goes in `#lib/remotes/<entity>.remote.ts`. When a second place starts using a route's remote, move it there.

Conventions:

- `query(schema, handler)` for reads, `command(schema, handler)` for writes, `form(schema, handler)` for forms. First arg is a Zod schema (inline `z.object({...})` or a bare `z.uuid()` etc).
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

## 6. Permissions layer — `#lib/permissions.ts` (when roles are used)

- One CASL `Permissions` type: a union of `[action, subject]` tuples, subjects being either a `Pick<Entity, 'fieldsUsedInConditions'>` or the bare string name.
- **Hard-coded roles**:
  - Roles are the `USER_ROLES` constant (`#lib/schema/user.schema.ts`), stored in the `user.role` enum column.
  - `definePermissionsFor(user)` builds rules per `user.role`, then applies cross-cutting restrictions after the role blocks (e.g. `if (user.banned) cannot('create', 'post');`).
  - `defineGuestPermissions()` returns the ability for anonymous requests, so `locals.permissions` is always set.
- **Database roles**:
  - Roles live in the `role` table (readable ids: `GUEST`, `USER`, `ADMIN`), and their CASL rules in `role_permission` (`action`, `subject`, `fields`, `conditions`, `inverted`). `user.role` references `role.id`.
  - `AuthHook` sets `locals.permissions` from `PermissionService.forUser(user)`. Anonymous requests use the `GUEST` role. Rules are cached for a minute; call `PermissionService.invalidate(roleId)` after changing them.
  - Conditions may use `${user.id}` / `${user.role}` placeholders, filled per request by `buildPermissions`.
  - `PermissionService.seedDefaults()` (run from `init` in `hooks.server.ts`) seeds the default roles into an empty database. Change roles in the database afterwards, not in the seed.
  - The `Permissions` type still lists every action and subject the code checks: when code checks a new action or subject, add it there too.
- Field-level restrictions: `can('update', 'post', ['title'], { authorId: user.id })`.

```ts
type PostSubject = Pick<Post, 'authorId' | 'status'>;

type Permissions = MongoAbility<
	| ['access', 'admin']
	| ['create' | 'read' | 'update' | 'delete', PostSubject | 'post']
>;
```

---

# General conventions

- Indentation: tabs. Quotes: single quotes.
- Imports: `type` imports in their own group, separated from value imports; alphabetized by path within each group; prefer subpath imports (`#lib/*`, `#db`, `#db/*`, `#services/*`) and `$app/env/private` over relative paths that cross layers.
- No classes, no default exports — every module exports one plain object of functions.
- Error handling: neverthrow (`ok`/`err`) everywhere except the Remote layer, where `Result` is converted to `error(status, message)`.
- Error codes are `'SCREAMING_SNAKE_CASE' as const` string literals, not custom Error subclasses.
- Logging: one `const Log = createLogger('layer:name');` per file. `.info` for successful mutations, `.warn` for invalid/rejected input, `.error` for caught exceptions, `.verbose` for expected/handled failures (e.g. signature validation failure).
- IDs:
  - PostgreSQL: `better-auth` user IDs are `text`; other entities use `uuid` strings.
  - MySQL: `better-auth` user IDs are `varchar(36)`; other entities use `crypto.randomUUID()` strings in `varchar(36)`.
  - SQLite: `better-auth` user IDs are `text`; other entities use `crypto.randomUUID()` strings in `text`.
- The Flow/Returns/Notes JSDoc block is scoped to the Query and Service layers only — never add it to Remote, Schema, DB schema, or Permissions files.

# What NOT to do

- Don't put permission, auth, or ownership checks in the Query layer.
- Don't put Zod validation, db calls, or server-only imports in the Schema layer.
- Don't call the Query layer directly from the Remote layer — always go through a Service.
- Don't call `error()` from anywhere except the Remote layer.
- Don't put a remote in `#lib/remotes` while only one route uses it; keep it in that route's directory.
- Don't swallow errors — always `return err(...)` and log via `Log`.
- Don't use classes or default exports.
