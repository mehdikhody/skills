// #file-if auth
export type User = typeof UserTable.$inferSelect;
export type NewUser = typeof UserTable.$inferInsert;

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { DEFAULT_USER_ROLE_ID } from '#lib/schema/role.schema.ts'; // @if roles-db
import { USER_ROLES } from '#lib/schema/user.schema.ts'; // @if roles-hardcoded
import { RoleTable } from './role.schema.ts'; // @if roles-db

/** better-auth's `user` model, plus this project's columns. Mapped in `#lib/server/auth.ts`. */
export const UserTable = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	username: text('username').unique(), // @if username
	displayUsername: text('display_username'), // @if username
	phoneNumber: text('phone_number').notNull().unique(), // @if phone
	phoneNumberVerified: integer('phone_number_verified', { mode: 'boolean' }).notNull().default(false), // @if phone
	twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false), // @if two-factor
	role: text('role', { enum: USER_ROLES }).notNull().default('USER'), // @if roles-hardcoded
	role: text('role').notNull().default(DEFAULT_USER_ROLE_ID).references(() => RoleTable.id), // @if roles-db
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
});
