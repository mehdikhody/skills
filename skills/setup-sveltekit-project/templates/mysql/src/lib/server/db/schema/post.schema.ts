// #file-if auth
export type Post = typeof PostTable.$inferSelect;
export type NewPost = typeof PostTable.$inferInsert;

import { mysqlEnum, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { POST_STATUSES } from '#lib/schema/post.schema.ts';
import { UserTable } from './user.schema.ts';

export const PostTable = mysqlTable('post', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	authorId: varchar('author_id', { length: 36 })
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	// MySQL TEXT columns can't take a literal default; fill it on insert instead.
	body: text('body')
		.notNull()
		.$defaultFn(() => ''),
	status: mysqlEnum('status', POST_STATUSES).notNull().default('DRAFT'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
