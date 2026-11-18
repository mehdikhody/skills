// #file-if auth
import { relations } from 'drizzle-orm';
import { AccountTable } from './account.schema.ts';
import { PostTable } from './post.schema.ts'; // @if demo
import { RolePermissionTable, RoleTable } from './role.schema.ts'; // @if roles-db
import { SessionTable } from './session.schema.ts';
import { TwoFactorTable } from './two-factor.schema.ts'; // @if two-factor
import { UserTable } from './user.schema.ts';

// All relations live here, so table files never import each other in a circle.

export const UserRelations = relations(UserTable, ({ many, one }) => ({ // @if roles-db
export const UserRelations = relations(UserTable, ({ many }) => ({ // @if !roles-db
	sessions: many(SessionTable),
	accounts: many(AccountTable),
	twoFactors: many(TwoFactorTable), // @if two-factor
	role: one(RoleTable, { fields: [UserTable.role], references: [RoleTable.id] }), // @if roles-db
	posts: many(PostTable) // @if demo
}));

export const SessionRelations = relations(SessionTable, ({ one }) => ({
	user: one(UserTable, { fields: [SessionTable.userId], references: [UserTable.id] })
}));

export const AccountRelations = relations(AccountTable, ({ one }) => ({
	user: one(UserTable, { fields: [AccountTable.userId], references: [UserTable.id] })
}));
// #if two-factor

export const TwoFactorRelations = relations(TwoFactorTable, ({ one }) => ({
	user: one(UserTable, { fields: [TwoFactorTable.userId], references: [UserTable.id] })
}));
// #endif
// #if roles-db

export const RoleRelations = relations(RoleTable, ({ many }) => ({
	users: many(UserTable),
	permissions: many(RolePermissionTable)
}));

export const RolePermissionRelations = relations(RolePermissionTable, ({ one }) => ({
	role: one(RoleTable, { fields: [RolePermissionTable.roleId], references: [RoleTable.id] })
}));
// #endif
// #if demo

export const PostRelations = relations(PostTable, ({ one }) => ({
	author: one(UserTable, { fields: [PostTable.authorId], references: [UserTable.id] })
}));
// #endif
