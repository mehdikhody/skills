// #file-if auth
export type Verification = typeof VerificationTable.$inferSelect;
export type NewVerification = typeof VerificationTable.$inferInsert;

import { index, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

/** better-auth's `verification` model: pending codes and tokens. */
export const VerificationTable = mysqlTable(
	'verification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		identifier: varchar('identifier', { length: 255 }).notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);
