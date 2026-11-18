import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	SMS_TRANSPORT: {
		description:
			'How SMS is sent: `console` logs codes (development default), `farazsms` sends them (production default).',
		schema: z.enum(['console', 'farazsms']).optional()
	},
	FARAZSMS_API_KEY: {
		description: 'FarazSMS (IranPayamak) panel API key.',
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
});
