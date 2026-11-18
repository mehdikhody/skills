import { BETTER_AUTH_SECRET, ORIGIN } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '#db';

/**
 * Sign-in is email + password (better-auth's default). No phone, no SMS.
 *
 * Client flows (see `#lib/auth-client.ts`):
 * - Sign up: `signUp.email({ email, name, password })`.
 * - Sign in: `signIn.email({ email, password })`.
 */
export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		revokeSessionsOnPasswordReset: true
	},
	user: {
		additionalFields: {
			role: { type: 'string', required: false, defaultValue: 'USER', input: false }
		}
	},
	telemetry: { enabled: false },
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
