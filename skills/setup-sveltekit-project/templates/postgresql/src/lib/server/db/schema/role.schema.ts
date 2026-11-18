// #file-if roles-db
export type Role = typeof RoleTable.$inferSelect;
export type NewRole = typeof RoleTable.$inferInsert;
export type RolePermission = typeof RolePermissionTable.$inferSelect;
export type NewRolePermission = typeof RolePermissionTable.$inferInsert;

import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** A role users hold. The id is a readable key (`USER`, `ADMIN`), so code and seeds can name it. */
export const RoleTable = pgTable('role', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

/**
 * One CASL rule of a role. `conditions` may hold `${user.id}` / `${user.role}` placeholders, filled
 * per request (`buildPermissions` in `#lib/permissions.ts`).
 */
export const RolePermissionTable = pgTable(
	'role_permission',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roleId: text('role_id')
			.notNull()
			.references(() => RoleTable.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		subject: text('subject').notNull(),
		fields: jsonb('fields').$type<string[]>(),
		conditions: jsonb('conditions').$type<Record<string, unknown>>(),
		inverted: boolean('inverted').notNull().default(false),
		reason: text('reason'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('role_permission_role_id_idx').on(table.roleId)]
);
