// #file-if auth,demo
import type { RequestEvent } from '@sveltejs/kit';
import type {
	PostCreateParams,
	PostListParams,
	PostUpdateParams
} from '#lib/schema/post.schema.ts';
import { subject } from '@casl/ability'; // @if permissions
import { err, ok } from 'neverthrow';
import { PostQuery } from '#db/query/post.query.ts';

export const PostService = {
	/**
	 * Lists the posts the caller may see.
	 *
	 * Flow:
	 * 1. Resolves the UI-only `MINE` filter to the caller's id (signed-in only).
	 * 2. `ALL` returns every post for admins and only published posts for everyone else. // @if permissions
	 * 2. `ALL` returns published posts. // @if !permissions
	 *
	 * Returns:
	 * - Ok(Post[])
	 * - Err(FORBIDDEN) if `MINE` is asked for anonymously
	 * - Err(DB_ERROR) if the query fails
	 */
	list: async (event: RequestEvent, { filter }: PostListParams) => {
		const { user } = event.locals; // @if !permissions
		const { user, permissions } = event.locals; // @if permissions

		if (filter === 'MINE') {
			if (!user) return err('FORBIDDEN' as const);
			return PostQuery.list({ authorId: user.id });
		}

		if (permissions.can('access', 'admin')) return PostQuery.list({}); // @if permissions
		return PostQuery.list({ status: 'PUBLISHED' });
	},

	/**
	 * Finds one post the caller may read.
	 *
	 * Returns:
	 * - Ok(Post)
	 * - Err(FORBIDDEN) if the caller may not read it (e.g. someone else's draft)
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if the query fails
	 */
	find: async (event: RequestEvent, id: string) => {
		// #if permissions
		const { permissions } = event.locals;
		if (!permissions.can('read', 'post')) return err('FORBIDDEN' as const);

		const post = await PostQuery.findById(id);
		if (post.isErr()) return err(post.error);
		if (!permissions.can('read', subject('post', post.value))) return err('FORBIDDEN' as const);
		// #else
		const { user } = event.locals;

		const post = await PostQuery.findById(id);
		if (post.isErr()) return err(post.error);
		// Drafts are visible to their author only.
		if (post.value.status !== 'PUBLISHED' && post.value.authorId !== user?.id) {
			return err('FORBIDDEN' as const);
		}
		// #endif

		return ok(post.value);
	},

	/**
	 * Creates a draft post authored by the caller.
	 *
	 * Returns:
	 * - Ok(Post) with the new row
	 * - Err(FORBIDDEN) if the caller is anonymous or may not create posts
	 * - Err(DB_ERROR) if the insert fails
	 */
	create: async (event: RequestEvent, params: PostCreateParams) => {
		const { user } = event.locals; // @if !permissions
		if (!user) return err('FORBIDDEN' as const); // @if !permissions
		const { user, permissions } = event.locals; // @if permissions
		if (!user || !permissions.can('create', 'post')) return err('FORBIDDEN' as const); // @if permissions

		const post = await PostQuery.create({ ...params, authorId: user.id });
		if (post.isErr()) return err(post.error);

		return ok(post.value);
	},

	/**
	 * Updates a post's title, body or status for its author (or an admin). // @if permissions
	 * Updates a post's title, body or status for its author. // @if !permissions
	 *
	 * Flow:
	 * 1. Pre-filters on the bare `post` subject type. // @if permissions
	 * 1. Rejects anonymous callers. // @if !permissions
	 * 2. Loads the post.
	 * 3. Checks the loaded row, so CASL evaluates the ownership condition. // @if permissions
	 * 3. Checks the caller wrote it. // @if !permissions
	 * 4. Writes the change.
	 *
	 * Returns:
	 * - Ok(Post) with the updated row
	 * - Err(FORBIDDEN) if the caller may not update this post
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if a query fails
	 */
	update: async (event: RequestEvent, { id, ...changes }: PostUpdateParams) => {
		const { user } = event.locals; // @if !permissions
		if (!user) return err('FORBIDDEN' as const); // @if !permissions
		const { user, permissions } = event.locals; // @if permissions
		if (!user || !permissions.can('update', 'post')) return err('FORBIDDEN' as const); // @if permissions

		const post = await PostQuery.findById(id);
		if (post.isErr()) return err(post.error);
		if (post.value.authorId !== user.id) return err('FORBIDDEN' as const); // @if !permissions
		if (!permissions.can('update', subject('post', post.value))) return err('FORBIDDEN' as const); // @if permissions

		const updated = await PostQuery.update(id, changes);
		if (updated.isErr()) return err(updated.error);

		return ok(updated.value);
	},

	/**
	 * Deletes a post for its author (or an admin). // @if permissions
	 * Deletes a post for its author. // @if !permissions
	 *
	 * Returns:
	 * - Ok(Post) with the deleted row
	 * - Err(FORBIDDEN) if the caller may not delete this post
	 * - Err(POST_NOT_FOUND) if no post has that id
	 * - Err(DB_ERROR) if a query fails
	 */
	remove: async (event: RequestEvent, id: string) => {
		const { user } = event.locals; // @if !permissions
		if (!user) return err('FORBIDDEN' as const); // @if !permissions
		const { user, permissions } = event.locals; // @if permissions
		if (!user || !permissions.can('delete', 'post')) return err('FORBIDDEN' as const); // @if permissions

		const post = await PostQuery.findById(id);
		if (post.isErr()) return err(post.error);
		if (post.value.authorId !== user.id) return err('FORBIDDEN' as const); // @if !permissions
		if (!permissions.can('delete', subject('post', post.value))) return err('FORBIDDEN' as const); // @if permissions

		const removed = await PostQuery.remove(id);
		if (removed.isErr()) return err(removed.error);

		return ok(removed.value);
	}
};
