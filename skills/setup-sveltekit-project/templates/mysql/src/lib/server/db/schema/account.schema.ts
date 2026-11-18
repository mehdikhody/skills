// #file-if auth
export type Account = typeof AccountTable.$inferSelect;
export type NewAccount = typeof AccountTable.$inferInsert;

import { index, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `account` model: one row per sign-in method (`credential` holds the password). */
export const AccountTable = mysqlTable(
	'account',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { fsp: 3 }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { fsp: 3 }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('account_user_id_idx').on(table.userId)]
);
