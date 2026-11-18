// #file-if auth
export type Verification = typeof VerificationTable.$inferSelect;
export type NewVerification = typeof VerificationTable.$inferInsert;

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** better-auth's `verification` model: pending codes and tokens. */
export const VerificationTable = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);
