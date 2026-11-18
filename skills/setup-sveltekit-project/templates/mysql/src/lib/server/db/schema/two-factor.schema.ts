// #file-if two-factor
export type TwoFactor = typeof TwoFactorTable.$inferSelect;
export type NewTwoFactor = typeof TwoFactorTable.$inferInsert;

import { boolean, index, int, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `twoFactor` model (twoFactor plugin). */
export const TwoFactorTable = mysqlTable(
	'two_factor',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		secret: varchar('secret', { length: 255 }).notNull(),
		backupCodes: text('backup_codes').notNull(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		verified: boolean('verified').default(true),
		failedVerificationCount: int('failed_verification_count').default(0),
		lockedUntil: timestamp('locked_until', { fsp: 3 })
	},
	(table) => [
		index('two_factor_secret_idx').on(table.secret),
		index('two_factor_user_id_idx').on(table.userId)
	]
);
