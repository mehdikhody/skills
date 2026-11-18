import { BETTER_AUTH_SECRET, ORIGIN } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { phoneNumber, twoFactor, username } from 'better-auth/plugins';
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
 * Sign-in is username + password, then an SMS code to the account's phone (twoFactor OTP).
 *
 * Client flows (see `#lib/auth-client.ts`):
 * - Sign up: `signUp.email({ email: Phone.placeholderEmail(phone), name, username, password, phoneNumber })`,
 *   then `phoneNumber.sendOtp` + `phoneNumber.verify({ disableSession: true })` to verify the phone.
 * - Sign in: `signIn.username(...)` answers `twoFactorRedirect`, then `twoFactor.sendOtp()` +
 *   `twoFactor.verifyOtp({ code })` creates the session.
 * - Password reset: `phoneNumber.requestPasswordReset` + `phoneNumber.resetPassword`.
 */
export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		// No session before the SMS step: the user signs in (and passes 2FA) after signing up.
		autoSignIn: false,
		revokeSessionsOnPasswordReset: true
	},
	user: {
		additionalFields: {
			role: { type: 'string', required: false, defaultValue: 'USER', input: false }
		}
	},
	databaseHooks: {
		user: {
			create: {
				// Every account needs a valid phone and always has two-step verification on.
				async before(user) {
					const phone = Phone.normalize(String(user.phoneNumber ?? ''));
					if (!phone) {
						throw APIError.from('BAD_REQUEST', {
							code: 'INVALID_PHONE_NUMBER',
							message: 'A valid Iranian mobile number is required'
						});
					}
					return { data: { ...user, phoneNumber: phone, twoFactorEnabled: true } };
				}
			}
		}
	},
	telemetry: { enabled: false },
	plugins: [
		username(),
		phoneNumber({
			otpLength: 5,
			expiresIn: SMS_CODE_LIFETIME_MINUTES * 60,
			allowedAttempts: 3,
			phoneNumberValidator: (value) => Phone.normalize(value) === value,
			sendOTP: ({ phoneNumber, code }) => sendCode(phoneNumber, code),
			sendPasswordResetOTP: ({ phoneNumber, code }) => sendCode(phoneNumber, code)
		}),
		// Two-step verification: an SMS code after the password. SMS only, no authenticator apps.
		twoFactor({
			totpOptions: { disable: true },
			otpOptions: {
				period: SMS_CODE_LIFETIME_MINUTES,
				digits: 5,
				allowedAttempts: 3,
				sendOTP: ({ user, otp }) =>
					sendCode((user as { phoneNumber?: string | null }).phoneNumber ?? '', otp)
			}
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
