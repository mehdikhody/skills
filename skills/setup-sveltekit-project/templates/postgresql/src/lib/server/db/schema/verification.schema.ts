// #file-if auth
export type Verification = typeof VerificationTable.$inferSelect;
export type NewVerification = typeof VerificationTable.$inferInsert;

import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** better-auth's `verification` model: pending codes and tokens. */
export const VerificationTable = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);
