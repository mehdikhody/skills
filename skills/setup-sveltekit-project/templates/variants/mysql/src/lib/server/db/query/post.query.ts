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
	 * Flow:
	 * 1. Generates the id up front (MySQL has no RETURNING).
	 * 2. Inserts the row and reads it back in one transaction.
	 *
	 * Returns:
	 * - Ok(Post) with the inserted row
	 * - Err(DB_ERROR) if the insert fails
	 */
	create: async (values: NewPost) => {
		try {
			const id = values.id ?? crypto.randomUUID();
			const post = await db.transaction(async (tx) => {
				await tx.insert(PostTable).values({ ...values, id });
				const [inserted] = await tx.select().from(PostTable).where(eq(PostTable.id, id));
				return inserted;
			});
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Updates a post's editable fields.
	 *
	 * Flow:
	 * 1. Checks the row exists (MySQL has no RETURNING).
	 * 2. Updates it and reads it back in one transaction.
	 *
	 * Returns:
	 * - Ok(Post) with the updated row
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the update fails
	 */
	update: async (id: string, changes: Partial<Pick<Post, 'title' | 'body' | 'status'>>) => {
		try {
			const post = await db.transaction(async (tx) => {
				const [existing] = await tx.select().from(PostTable).where(eq(PostTable.id, id));
				if (!existing) return null;

				await tx.update(PostTable).set(changes).where(eq(PostTable.id, id));
				const [updated] = await tx.select().from(PostTable).where(eq(PostTable.id, id));
				return updated;
			});
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Deletes a post.
	 *
	 * Flow:
	 * 1. Reads the row (MySQL has no RETURNING).
	 * 2. Deletes it in the same transaction.
	 *
	 * Returns:
	 * - Ok(Post) with the deleted row
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the delete fails
	 */
	remove: async (id: string) => {
		try {
			const post = await db.transaction(async (tx) => {
				const [existing] = await tx.select().from(PostTable).where(eq(PostTable.id, id));
				if (!existing) return null;

				await tx.delete(PostTable).where(eq(PostTable.id, id));
				return existing;
			});
			if (!post) return err('POST_NOT_FOUND' as const);
			return ok(post);
		} catch {
			return err('DB_ERROR' as const);
		}
	}
};
