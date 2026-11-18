// #file-if auth
export type Session = typeof SessionTable.$inferSelect;
export type NewSession = typeof SessionTable.$inferInsert;

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `session` model. */
export const SessionTable = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		token: text('token').notNull().unique(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);
