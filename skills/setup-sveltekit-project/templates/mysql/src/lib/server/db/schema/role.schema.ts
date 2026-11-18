// #file-if roles-db
export type Role = typeof RoleTable.$inferSelect;
export type NewRole = typeof RoleTable.$inferInsert;
export type RolePermission = typeof RolePermissionTable.$inferSelect;
export type NewRolePermission = typeof RolePermissionTable.$inferInsert;

import { boolean, index, json, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

/** A role users hold. The id is a readable key (`USER`, `ADMIN`), so code and seeds can name it. */
export const RoleTable = mysqlTable('role', {
	id: varchar('id', { length: 64 }).primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

/**
 * One CASL rule of a role. `conditions` may hold `${user.id}` / `${user.role}` placeholders, filled
 * per request (`buildPermissions` in `#lib/permissions.ts`).
 */
export const RolePermissionTable = mysqlTable(
	'role_permission',
	{
		id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
		roleId: varchar('role_id', { length: 64 })
			.notNull()
			.references(() => RoleTable.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		subject: text('subject').notNull(),
		fields: json('fields').$type<string[]>(),
		conditions: json('conditions').$type<Record<string, unknown>>(),
		inverted: boolean('inverted').notNull().default(false),
		reason: text('reason'),
		createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('role_permission_role_id_idx').on(table.roleId)]
);
