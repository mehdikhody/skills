// #file-if auth,demo
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { command, getRequestEvent, query } from '$app/server';
import { PostCreateSchema, PostListSchema, PostUpdateSchema } from '#lib/schema/post.schema.ts';
import { PostService } from '#services/post.service.ts';

export const getPosts = query(PostListSchema, async (params) => {
	const event = getRequestEvent();
	const result = await PostService.list(event, params);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		error(500, 'Internal Server Error');
	}

	return result.value;
});

export const getPost = query(z.uuid(), async (id) => {
	const event = getRequestEvent();
	const result = await PostService.find(event, id);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		if (result.error === 'POST_NOT_FOUND') error(404, 'Post Not Found');
		error(500, 'Internal Server Error');
	}

	return result.value;
});

export const createPost = command(PostCreateSchema, async (params) => {
	const event = getRequestEvent();
	const result = await PostService.create(event, params);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		error(500, 'Internal Server Error');
	}

	return result.value;
});

export const updatePost = command(PostUpdateSchema, async (params) => {
	const event = getRequestEvent();
	const result = await PostService.update(event, params);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		if (result.error === 'POST_NOT_FOUND') error(404, 'Post Not Found');
		error(500, 'Internal Server Error');
	}

	return result.value;
});

export const deletePost = command(z.uuid(), async (id) => {
	const event = getRequestEvent();
	const result = await PostService.remove(event, id);
	if (result.isErr()) {
		if (result.error === 'FORBIDDEN') error(403, 'Forbidden');
		if (result.error === 'POST_NOT_FOUND') error(404, 'Post Not Found');
		error(500, 'Internal Server Error');
	}

	return result.value;
});
