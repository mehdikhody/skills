// #file-if auth
export type User = typeof UserTable.$inferSelect;
export type NewUser = typeof UserTable.$inferInsert;

import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'; // @if !roles-hardcoded
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'; // @if roles-hardcoded
import { DEFAULT_USER_ROLE_ID } from '#lib/schema/role.schema.ts'; // @if roles-db
import { USER_ROLES } from '#lib/schema/user.schema.ts'; // @if roles-hardcoded
import { RoleTable } from './role.schema.ts'; // @if roles-db

export const UserRoleEnum = pgEnum('user_role', USER_ROLES); // @if roles-hardcoded

/** better-auth's `user` model, plus this project's columns. Mapped in `#lib/server/auth.ts`. */
export const UserTable = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	username: text('username').unique(), // @if username
	displayUsername: text('display_username'), // @if username
	phoneNumber: text('phone_number').notNull().unique(), // @if phone
	phoneNumberVerified: boolean('phone_number_verified').notNull().default(false), // @if phone
	twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false), // @if two-factor
	role: UserRoleEnum('role').notNull().default('USER'), // @if roles-hardcoded
	role: text('role').notNull().default(DEFAULT_USER_ROLE_ID).references(() => RoleTable.id), // @if roles-db
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
