// #file-if auth
import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { defineGuestPermissions, definePermissionsFor } from '#lib/permissions.ts'; // @if roles-hardcoded
import { emptyPermissions } from '#lib/permissions.ts'; // @if roles-db
import { auth } from '#lib/server/auth.ts';
import { PermissionService } from '#services/permission.service.ts'; // @if roles-db

/** Puts the session on `locals` and lets better-auth answer its own `/api/auth/*` routes. */
export const AuthHook: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// #if roles-hardcoded
	// Anonymous requests still get an ability (guest rules), so permission checks never hit an
	// undefined `locals.permissions`.
	event.locals.permissions = session
		? definePermissionsFor(session.user)
		: defineGuestPermissions();
	// #endif
	// #if roles-db
	// Rules come from the role tables (cached briefly). If they can't be loaded, fail closed.
	const permissions = await PermissionService.forUser(event.locals.user);
	if (permissions.isErr()) console.error('Loading permissions failed:', permissions.error);
	event.locals.permissions = permissions.isOk() ? permissions.value : emptyPermissions();
	// #endif

	return svelteKitHandler({ event, resolve, auth, building });
};
