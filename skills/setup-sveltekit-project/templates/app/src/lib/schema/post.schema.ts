// #file-if auth,demo
import { z } from 'zod';

export const POST_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** `MINE` is UI-only: the Service resolves it to the caller's id before querying. */
export const POST_FILTERS = ['ALL', 'MINE'] as const;
export type PostFilter = (typeof POST_FILTERS)[number];

export const PostListSchema = z.object({
	filter: z.enum(POST_FILTERS).default('ALL')
});
export type PostListParams = z.infer<typeof PostListSchema>;

export const PostCreateSchema = z.object({
	title: z.string().trim().min(1).max(200),
	body: z.string().trim().max(20_000).default('')
});
export type PostCreateParams = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = z.object({
	id: z.uuid(),
	title: z.string().trim().min(1).max(200).optional(),
	body: z.string().trim().max(20_000).optional(),
	status: z.enum(POST_STATUSES).optional()
});
export type PostUpdateParams = z.infer<typeof PostUpdateSchema>;
