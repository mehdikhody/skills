// #file-if auth
export type Session = typeof SessionTable.$inferSelect;
export type NewSession = typeof SessionTable.$inferInsert;

import { index, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `session` model. */
export const SessionTable = mysqlTable(
	'session',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		token: varchar('token', { length: 255 }).notNull().unique(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);
