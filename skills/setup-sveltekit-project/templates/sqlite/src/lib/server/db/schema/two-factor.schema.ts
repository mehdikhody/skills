// #file-if two-factor
export type TwoFactor = typeof TwoFactorTable.$inferSelect;
export type NewTwoFactor = typeof TwoFactorTable.$inferInsert;

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `twoFactor` model (twoFactor plugin). */
export const TwoFactorTable = sqliteTable(
	'two_factor',
	{
		id: text('id').primaryKey(),
		secret: text('secret').notNull(),
		backupCodes: text('backup_codes').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		verified: integer('verified', { mode: 'boolean' }).default(true),
		failedVerificationCount: integer('failed_verification_count').default(0),
		lockedUntil: integer('locked_until', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('two_factor_secret_idx').on(table.secret),
		index('two_factor_user_id_idx').on(table.userId)
	]
);
