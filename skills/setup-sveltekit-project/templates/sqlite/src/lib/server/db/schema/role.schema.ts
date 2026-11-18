// #file-if roles-db
export type Role = typeof RoleTable.$inferSelect;
export type NewRole = typeof RoleTable.$inferInsert;
export type RolePermission = typeof RolePermissionTable.$inferSelect;
export type NewRolePermission = typeof RolePermissionTable.$inferInsert;

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** A role users hold. The id is a readable key (`USER`, `ADMIN`), so code and seeds can name it. */
export const RoleTable = sqliteTable('role', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
});

/**
 * One CASL rule of a role. `conditions` may hold `${user.id}` / `${user.role}` placeholders, filled
 * per request (`buildPermissions` in `#lib/permissions.ts`).
 */
export const RolePermissionTable = sqliteTable(
	'role_permission',
	{
		id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
		roleId: text('role_id')
			.notNull()
			.references(() => RoleTable.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		subject: text('subject').notNull(),
		fields: text('fields', { mode: 'json' }).$type<string[]>(),
		conditions: text('conditions', { mode: 'json' }).$type<Record<string, unknown>>(),
		inverted: integer('inverted', { mode: 'boolean' }).notNull().default(false),
		reason: text('reason'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [index('role_permission_role_id_idx').on(table.roleId)]
);
