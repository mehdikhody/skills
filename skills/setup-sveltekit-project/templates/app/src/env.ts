// #file-if db|auth
import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod'; // @if phone

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' }, // @if db
	// #if auth
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	// #endif
	// #if phone
	FARAZSMS_API_KEY: {
		description:
			'FarazSMS (IranPayamak) panel API key. With FARAZSMS_LINE_NUMBER set, SMS is sent through FarazSMS; without them, dev logs SMS to the console and production refuses to send.',
		schema: z.string().optional()
	},
	FARAZSMS_LINE_NUMBER: {
		description: 'FarazSMS sender line number.',
		schema: z.string().optional()
	},
	FARAZSMS_PATTERN_VERIFICATION_CODE: {
		description: 'Approved FarazSMS pattern code for verification codes (one variable: `code`).',
		schema: z.string().optional()
	}
	// #endif
});
