import { building } from '$app/env';
import { type Handle, sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { defineGuestPermissions, definePermissionsFor } from '#lib/permissions.ts';
import { auth } from '#lib/server/auth.ts';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// Anonymous requests still get an ability (guest rules), so permission checks never hit an
	// undefined `locals.permissions`.
	event.locals.permissions = defineGuestPermissions();

	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
		event.locals.permissions = definePermissionsFor(session.user);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth);
