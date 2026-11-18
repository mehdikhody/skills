import type { SQL } from 'drizzle-orm';
import type { NewPost, Post } from '#db/schema/post.schema.ts';
import type { PostStatus } from '#lib/schema/post.schema.ts';
import { and, desc, eq } from 'drizzle-orm';
import { err, ok } from 'neverthrow';
import { db } from '#db';
import { PostTable } from '#db/schema/post.schema.ts';

export const PostQuery = {
	/**
	 * Finds one post by id.
	 *
	 * Returns:
	 * - Ok(Post) when it exists
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the query fails
	 */
	findById: async (id: string) => {
		try {
			const [post] = await db.select().from(PostTable).where(eq(PostTable.id, id)).limit(1);
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Lists posts, newest first, narrowed by the given filters.
	 *
	 * Flow:
	 * 1. Builds one condition per filter that is set.
	 * 2. Selects the matching rows.
	 *
	 * Returns:
	 * - Ok(Post[]) (possibly empty)
	 * - Err(DB_ERROR) if the query fails
	 *
	 * Notes:
	 * - Not paginated yet: switch to count + select in a transaction through `paginate()` once
	 *   `#lib/server/pagination.ts` exists.
	 */
	list: async (filters: { authorId?: string; status?: PostStatus }) => {
		try {
			const conditions: SQL[] = [];
			if (filters.authorId) conditions.push(eq(PostTable.authorId, filters.authorId));
			if (filters.status) conditions.push(eq(PostTable.status, filters.status));

			const posts = await db
				.select()
				.from(PostTable)
				.where(and(...conditions))
				.orderBy(desc(PostTable.createdAt));

			return ok(posts);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Inserts a post.
	 *
	 * Returns:
	 * - Ok(Post) with the inserted row
	 * - Err(DB_ERROR) if the insert fails
	 */
	create: async (values: NewPost) => {
		try {
			const [post] = await db.insert(PostTable).values(values).returning();
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Updates a post's editable fields.
	 *
	 * Returns:
	 * - Ok(Post) with the updated row
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the update fails
	 */
	update: async (id: string, changes: Partial<Pick<Post, 'title' | 'body' | 'status'>>) => {
		try {
			const [post] = await db
				.update(PostTable)
				.set(changes)
				.where(eq(PostTable.id, id))
				.returning();
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Deletes a post.
	 *
	 * Returns:
	 * - Ok(Post) with the deleted row
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the delete fails
	 */
	remove: async (id: string) => {
		try {
			const [post] = await db.delete(PostTable).where(eq(PostTable.id, id)).returning();
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	}
};
