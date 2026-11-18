import type { Permissions } from '#lib/permissions.ts'; // @if permissions
import type { auth } from '#lib/server/auth.ts'; // @if auth

type AuthSession = typeof auth.$Infer.Session; // @if auth

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// #if auth
		interface Locals {
			/** Absent on anonymous requests. */
			user?: AuthSession['user'];
			session?: AuthSession['session'];
			/** Always set: guest rules when the request is anonymous. */
			permissions: Permissions; // @if permissions
		}
		// #else
		// interface Locals {}
		// #endif

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
