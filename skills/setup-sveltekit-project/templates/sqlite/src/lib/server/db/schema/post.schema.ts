// #file-if auth,demo
export type Post = typeof PostTable.$inferSelect;
export type NewPost = typeof PostTable.$inferInsert;

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { POST_STATUSES } from '#lib/schema/post.schema.ts';
import { UserTable } from './user.schema.ts';

export const PostTable = sqliteTable('post', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	authorId: text('author_id')
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	body: text('body').notNull().default(''),
	status: text('status', { enum: POST_STATUSES }).notNull().default('DRAFT'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
});
