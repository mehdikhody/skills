// #file-if two-factor
export type TwoFactor = typeof TwoFactorTable.$inferSelect;
export type NewTwoFactor = typeof TwoFactorTable.$inferInsert;

import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { UserTable } from './user.schema.ts';

/** better-auth's `twoFactor` model (twoFactor plugin). */
export const TwoFactorTable = pgTable(
	'two_factor',
	{
		id: text('id').primaryKey(),
		secret: text('secret').notNull(),
		backupCodes: text('backup_codes').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		verified: boolean('verified').default(true),
		failedVerificationCount: integer('failed_verification_count').default(0),
		lockedUntil: timestamp('locked_until')
	},
	(table) => [
		index('two_factor_secret_idx').on(table.secret),
		index('two_factor_user_id_idx').on(table.userId)
	]
);
