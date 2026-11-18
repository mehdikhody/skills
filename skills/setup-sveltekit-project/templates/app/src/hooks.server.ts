import type { Handle } from '@sveltejs/kit/hooks'; // @if !roles-db
import type { Handle, ServerInit } from '@sveltejs/kit/hooks'; // @if roles-db
import { sequence } from '@sveltejs/kit/hooks';
import { AuthHook } from '#lib/server/hooks/auth.hook.ts'; // @if auth
import { ParaglideHook } from '#lib/server/hooks/paraglide.hook.ts';
import { PermissionService } from '#services/permission.service.ts'; // @if roles-db

// #if roles-db
export const init: ServerInit = async () => {
	// A fresh database gets the default roles and their permissions once.
	const seeded = await PermissionService.seedDefaults();
	if (seeded.isErr()) console.error('Seeding the default roles failed:', seeded.error);
};
// #endif

export const handle: Handle = sequence(ParaglideHook, AuthHook); // @if auth
export const handle: Handle = sequence(ParaglideHook); // @if !auth
