// #file-if auth
import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { AuthService } from '#services/auth.service.ts';

// Shared across pages. The sign-in, registration and password-reset forms live in their routes
// (`src/routes/auth/*/*.remote.ts`).

/** The signed-in user from the session, or null. */
export const getCurrentUser = query(async () => {
	const { locals } = getRequestEvent();
	return locals.session && locals.user ? locals.user : null;
});

export const logout = command(async () => {
	const { request } = getRequestEvent();
	const result = await AuthService.logout(request.headers);
	if (result.isErr()) error(500, 'Could not sign out');
});
