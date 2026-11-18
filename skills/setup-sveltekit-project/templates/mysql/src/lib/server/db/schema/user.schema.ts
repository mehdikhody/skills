// #file-if auth
export type User = typeof UserTable.$inferSelect;
export type NewUser = typeof UserTable.$inferInsert;

import { boolean, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core'; // @if !roles-hardcoded
import { boolean, mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core'; // @if roles-hardcoded
import { DEFAULT_USER_ROLE_ID } from '#lib/schema/role.schema.ts'; // @if roles-db
import { USER_ROLES } from '#lib/schema/user.schema.ts'; // @if roles-hardcoded
import { RoleTable } from './role.schema.ts'; // @if roles-db

/** better-auth's `user` model, plus this project's columns. Mapped in `#lib/server/auth.ts`. */
export const UserTable = mysqlTable('user', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	username: varchar('username', { length: 255 }).unique(), // @if username
	displayUsername: text('display_username'), // @if username
	phoneNumber: varchar('phone_number', { length: 255 }).notNull().unique(), // @if phone
	phoneNumberVerified: boolean('phone_number_verified').notNull().default(false), // @if phone
	twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false), // @if two-factor
	role: mysqlEnum('role', USER_ROLES).notNull().default('USER'), // @if roles-hardcoded
	role: varchar('role', { length: 64 }).notNull().default(DEFAULT_USER_ROLE_ID).references(() => RoleTable.id), // @if roles-db
	createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
