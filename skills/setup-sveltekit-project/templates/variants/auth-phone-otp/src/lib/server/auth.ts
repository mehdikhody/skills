import type { PhoneNumber } from '#lib/phone-number.ts';
import { BETTER_AUTH_SECRET, ORIGIN } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { phoneNumber } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '#db';
import { Phone } from '#lib/phone-number.ts';
import { Sms } from '#lib/server/sms/sms.ts';

/** How long an SMS code stays valid. */
export const SMS_CODE_LIFETIME_MINUTES = 2;

const sendCode = async (to: string, code: string) => {
	const phone = Phone.normalize(to);
	if (!phone) {
		throw APIError.from('BAD_REQUEST', {
			code: 'INVALID_PHONE_NUMBER',
			message: 'Invalid phone number'
		});
	}

	const result = await Sms.send({ to: phone, pattern: 'verification-code', values: { code } });
	if (result.isErr()) {
		throw APIError.from('INTERNAL_SERVER_ERROR', { code: result.error, message: 'SMS failed' });
	}
};

/**
 * Passwordless: every sign-in is an SMS code to the phone. The first verified code creates the
 * account (with a placeholder email, which better-auth requires).
 *
 * Client flow (see `#lib/auth-client.ts`):
 * - `phoneNumber.sendOtp({ phoneNumber })`, then `phoneNumber.verify({ phoneNumber, code })`
 *   signs the user in, creating the account on the first verify.
 */
export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: false },
	user: {
		additionalFields: {
			role: { type: 'string', required: false, defaultValue: 'USER', input: false }
		}
	},
	databaseHooks: {
		user: {
			create: {
				// Every account needs a valid phone, stored in canonical form.
				async before(user) {
					const phone = Phone.normalize(String(user.phoneNumber ?? ''));
					if (!phone) {
						throw APIError.from('BAD_REQUEST', {
							code: 'INVALID_PHONE_NUMBER',
							message: 'A valid Iranian mobile number is required'
						});
					}
					return { data: { ...user, phoneNumber: phone } };
				}
			}
		}
	},
	telemetry: { enabled: false },
	plugins: [
		phoneNumber({
			otpLength: 5,
			expiresIn: SMS_CODE_LIFETIME_MINUTES * 60,
			allowedAttempts: 3,
			phoneNumberValidator: (value) => Phone.normalize(value) === value,
			sendOTP: ({ phoneNumber, code }) => sendCode(phoneNumber, code),
			// The validator above only lets canonical numbers through, so the cast is safe.
			signUpOnVerification: {
				getTempEmail: (phone) => Phone.placeholderEmail(phone as PhoneNumber),
				getTempName: (phone) => phone
			}
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
