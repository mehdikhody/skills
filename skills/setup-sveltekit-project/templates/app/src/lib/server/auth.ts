// #file-if auth
import type { PhoneNumber } from '#lib/phone-number.ts'; // @if phone
import { BETTER_AUTH_SECRET, ORIGIN } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api'; // @if phone
import { betterAuth } from 'better-auth/minimal';
// #if phone
import {
	phoneNumber,
	twoFactor, // @if two-factor
	username, // @if username
} from 'better-auth/plugins';
// #endif
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from '#db';
import { AccountTable } from '#db/schema/account.schema.ts';
import { SessionTable } from '#db/schema/session.schema.ts';
import { TwoFactorTable } from '#db/schema/two-factor.schema.ts'; // @if two-factor
import { UserTable } from '#db/schema/user.schema.ts';
import { VerificationTable } from '#db/schema/verification.schema.ts';
import { Phone } from '#lib/phone-number.ts'; // @if phone
import { DEFAULT_USER_ROLE_ID } from '#lib/schema/role.schema.ts'; // @if roles-db
import {
	OTP_EXPIRES_IN_SECONDS, // @if phone
	OTP_LENGTH, // @if phone
	PASSWORD_MAX_LENGTH, // @if !login-phone-otp
	PASSWORD_MIN_LENGTH, // @if !login-phone-otp
	USER_ROLES, // @if roles-hardcoded
	USERNAME_MAX_LENGTH, // @if username
	USERNAME_MIN_LENGTH, // @if username
	USERNAME_REGEX, // @if username
} from '#lib/schema/user.schema.ts';
import { Sms } from '#lib/server/sms/sms.ts'; // @if phone

// #if phone
/** Sends a verification code by SMS; better-auth reports a thrown APIError to its caller. */
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

// #endif
/**
 * better-auth configuration. Every sign-in flow runs on the server through `AuthService`
 * (`#services/auth.service.ts`), called from the remote functions in `#lib/remotes/auth.remote.ts`.
 *
 * Tables are this project's own, one file each under `#db/schema/`, mapped below. When adding a
 * plugin, add the columns or tables it needs by hand (see its docs, or
 * `npx auth generate --output tmp-auth.schema.ts` to see what it expects).
 */
export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg', // @if db-postgresql
		provider: 'mysql', // @if db-mysql
		provider: 'sqlite', // @if db-sqlite
		schema: {
			user: UserTable,
			session: SessionTable,
			account: AccountTable,
			verification: VerificationTable,
			twoFactor: TwoFactorTable, // @if two-factor
		},
	}),
	// #if login-phone-otp
	emailAndPassword: { enabled: false },
	// #else
	emailAndPassword: {
		enabled: true,
		minPasswordLength: PASSWORD_MIN_LENGTH,
		maxPasswordLength: PASSWORD_MAX_LENGTH,
		revokeSessionsOnPasswordReset: true,
	},
	// #endif
	// #if permissions
	user: {
		additionalFields: {
			// On the session so the UI can tailor its navigation. `input: false` keeps it out of sign-up
			// and update payloads; permission decisions reload the row (`AuthService.getCurrentUser`).
			role: { type: [...USER_ROLES], required: false, defaultValue: 'USER', input: false }, // @if roles-hardcoded
			role: { type: 'string', required: false, defaultValue: DEFAULT_USER_ROLE_ID, input: false }, // @if roles-db
		},
	},
	// #endif
	// #if phone
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
					return {
						data: {
							...user,
							phoneNumber: phone,
							twoFactorEnabled: true, // @if two-factor
						},
					};
				},
			},
		},
	},
	// #endif
	telemetry: { enabled: false },
	plugins: [
		// #if username
		username({
			minUsernameLength: USERNAME_MIN_LENGTH,
			maxUsernameLength: USERNAME_MAX_LENGTH,
			usernameValidator: (value) => USERNAME_REGEX.test(value),
		}),
		// #endif
		// #if phone
		phoneNumber({
			otpLength: OTP_LENGTH,
			expiresIn: OTP_EXPIRES_IN_SECONDS,
			allowedAttempts: 3,
			phoneNumberValidator: (value) => Phone.normalize(value) === value,
			requireVerification: true, // @if login-phone-password
			// Registration verifies the phone first: the first verified code creates the account.
			signUpOnVerification: {
				getTempEmail: (phone) => Phone.placeholderEmail(phone as PhoneNumber),
				getTempName: (phone) => phone,
			},
			sendOTP: ({ phoneNumber, code }) => sendCode(phoneNumber, code),
			sendPasswordResetOTP: ({ phoneNumber, code }) => sendCode(phoneNumber, code), // @if !login-phone-otp
		}),
		// #endif
		// #if two-factor
		// Two-step verification: an SMS code after the password. SMS only, no authenticator apps.
		twoFactor({
			totpOptions: { disable: true },
			otpOptions: {
				period: OTP_EXPIRES_IN_SECONDS / 60,
				digits: OTP_LENGTH,
				allowedAttempts: 3,
				sendOTP: ({ user, otp }) =>
					sendCode((user as { phoneNumber?: string | null }).phoneNumber ?? '', otp),
			},
		}),
		// #endif
		sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
	],
});
