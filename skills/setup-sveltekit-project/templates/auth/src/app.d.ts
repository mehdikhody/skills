import type { definePermissionsFor } from '#lib/permissions.ts';
import type { auth } from '#lib/server/auth.ts';

type AuthSession = typeof auth.$Infer.Session;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/** Absent on anonymous requests. */
			user?: AuthSession['user'];
			session?: AuthSession['session'];
			/** Always set: an ability with guest rules when the request is anonymous. */
			permissions: ReturnType<typeof definePermissionsFor>;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
