// #file-if auth
export type Post = typeof PostTable.$inferSelect;
export type NewPost = typeof PostTable.$inferInsert;

import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { POST_STATUSES } from '#lib/schema/post.schema.ts';
import { UserTable } from './user.schema.ts';

export const PostStatusEnum = pgEnum('post_status', POST_STATUSES);

export const PostTable = pgTable('post', {
	id: uuid('id').primaryKey().defaultRandom(),
	authorId: text('author_id')
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	body: text('body').notNull().default(''),
	status: PostStatusEnum('status').notNull().default('DRAFT'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
