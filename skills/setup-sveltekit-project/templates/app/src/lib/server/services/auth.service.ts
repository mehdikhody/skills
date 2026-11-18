// #file-if auth
import { APIError } from 'better-auth/api';
import { err, ok } from 'neverthrow';
import { UserQuery } from '#db/query/user.query.ts';
import { Phone } from '#lib/phone-number.ts'; // @if phone
import { OTP_EXPIRES_IN_SECONDS } from '#lib/schema/user.schema.ts'; // @if phone
import { auth } from '#lib/server/auth.ts';

/** better-auth puts its error code in the body of an APIError. */
const codeOf = (error: unknown) =>
	error instanceof APIError ? ((error.body as { code?: string } | undefined)?.code ?? null) : null;

const isRateLimited = (error: unknown) =>
	error instanceof APIError && error.status === 'TOO_MANY_REQUESTS';

// #if phone
/** Seconds until the user may ask for another code, from a cooldown error, else a full period. */
const remainingSecondsOf = (error: unknown) =>
	(error instanceof APIError
		? (error.body as { remainingSeconds?: number } | undefined)?.remainingSeconds
		: undefined) ?? OTP_EXPIRES_IN_SECONDS;

// #endif
/**
 * Every sign-in flow, server side. Remotes call these with the request headers so better-auth can
 * read and set its cookies; components never talk to better-auth directly.
 */
export const AuthService = {
	/**
	 * The full database row for the signed-in user.
	 *
	 * Flow:
	 * 1. Rejects anonymous requests.
	 * 2. Loads the row, so project columns (e.g. `role`) are current rather than session copies.
	 *
	 * Returns:
	 * - Ok(User)
	 * - Err(UNAUTHENTICATED) if there is no user, or the account no longer exists
	 * - Err(DB_ERROR) if the query fails
	 */
	getCurrentUser: async (userId: string | undefined) => {
		if (!userId) return err('UNAUTHENTICATED' as const);

		const found = await UserQuery.findById(userId);
		if (found.isErr()) return err(found.error);
		if (!found.value) return err('UNAUTHENTICATED' as const);

		return ok(found.value);
	},

	/**
	 * Ends the current session.
	 *
	 * Returns:
	 * - Ok(undefined)
	 * - Err(LOGOUT_FAILED) if better-auth refuses
	 */
	logout: async (headers: Headers) => {
		try {
			await auth.api.signOut({ headers });
			return ok(undefined);
		} catch {
			return err('LOGOUT_FAILED' as const);
		}
	},
	// #if login-username

	/**
	 * Checks username + password. Every account has two-step verification on, so success means
	 * "send the SMS code next", not a session.
	 *
	 * Returns:
	 * - Ok({ twoFactorRequired: true, maskedPhoneNumber }) when the code step comes next
	 * - Ok({ twoFactorRequired: false }) if the account has no second step
	 * - Err(INVALID_CREDENTIALS) on a wrong username or password
	 * - Err(RATE_LIMITED) on too many attempts
	 * - Err(LOGIN_FAILED) on anything else
	 */
	loginWithPassword: async (username: string, password: string, headers: Headers) => {
		try {
			const result = await auth.api.signInUsername({ headers, body: { username, password } });
			if (!('twoFactorRedirect' in result && result.twoFactorRedirect)) {
				return ok({ twoFactorRequired: false as const });
			}

			const user = await UserQuery.findByUsername(username.toLowerCase());
			if (user.isErr()) return err(user.error);
			const phone = user.value?.phoneNumber ? Phone.normalize(user.value.phoneNumber) : null;

			return ok({
				twoFactorRequired: true as const,
				maskedPhoneNumber: phone ? Phone.mask(phone) : null
			});
		} catch (error) {
			if (codeOf(error) === 'INVALID_USERNAME_OR_PASSWORD') return err('INVALID_CREDENTIALS' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('LOGIN_FAILED' as const);
		}
	},
	// #endif
	// #if login-phone-password

	/**
	 * Checks phone number + password and starts a session.
	 *
	 * Returns:
	 * - Ok(undefined) when signed in
	 * - Err(INVALID_PHONE_NUMBER) if the number isn't an Iranian mobile
	 * - Err(INVALID_CREDENTIALS) on a wrong number or password
	 * - Err(PHONE_NOT_VERIFIED) if the phone was never verified
	 * - Err(RATE_LIMITED) on too many attempts
	 * - Err(LOGIN_FAILED) on anything else
	 */
	loginWithPassword: async (phoneNumber: string, password: string, headers: Headers) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		try {
			await auth.api.signInPhoneNumber({ headers, body: { phoneNumber: phone, password } });
			return ok(undefined);
		} catch (error) {
			const code = codeOf(error);
			if (code === 'INVALID_PHONE_NUMBER_OR_PASSWORD') return err('INVALID_CREDENTIALS' as const);
			if (code === 'PHONE_NUMBER_NOT_VERIFIED') return err('PHONE_NOT_VERIFIED' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('LOGIN_FAILED' as const);
		}
	},
	// #endif
	// #if login-email

	/**
	 * Checks email + password and starts a session.
	 *
	 * Returns:
	 * - Ok(undefined) when signed in
	 * - Err(INVALID_CREDENTIALS) on a wrong email or password
	 * - Err(RATE_LIMITED) on too many attempts
	 * - Err(LOGIN_FAILED) on anything else
	 */
	loginWithPassword: async (email: string, password: string, headers: Headers) => {
		try {
			await auth.api.signInEmail({ headers, body: { email, password } });
			return ok(undefined);
		} catch (error) {
			if (codeOf(error) === 'INVALID_EMAIL_OR_PASSWORD') return err('INVALID_CREDENTIALS' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('LOGIN_FAILED' as const);
		}
	},

	/**
	 * Creates an account and signs it in.
	 *
	 * Returns:
	 * - Ok(undefined) when the account exists and is signed in
	 * - Err(EMAIL_TAKEN) if an account already uses the email
	 * - Err(RATE_LIMITED) on too many attempts
	 * - Err(REGISTER_FAILED) on anything else
	 */
	register: async (name: string, email: string, password: string, headers: Headers) => {
		try {
			await auth.api.signUpEmail({ headers, body: { name, email, password } });
			return ok(undefined);
		} catch (error) {
			const code = codeOf(error);
			if (code === 'USER_ALREADY_EXISTS' || code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
				return err('EMAIL_TAKEN' as const);
			}
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('REGISTER_FAILED' as const);
		}
	},
	// #endif
	// #if two-factor

	/**
	 * Sends (or re-sends) the sign-in SMS code, after `loginWithPassword` set the two-factor cookie.
	 *
	 * Returns:
	 * - Ok({ remainingSeconds }) until a new code may be requested
	 * - Err(INVALID_TWO_FACTOR_COOKIE) if the password step wasn't done or expired
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(SEND_FAILED) on anything else
	 */
	sendTwoFactorOtp: async (headers: Headers) => {
		try {
			await auth.api.sendTwoFactorOTP({ headers });
			return ok({ remainingSeconds: OTP_EXPIRES_IN_SECONDS });
		} catch (error) {
			const code = codeOf(error);
			if (code === 'INVALID_TWO_FACTOR_COOKIE') return err('INVALID_TWO_FACTOR_COOKIE' as const);
			if (code === 'OTP_COOLDOWN') return ok({ remainingSeconds: remainingSecondsOf(error) });
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('SEND_FAILED' as const);
		}
	},

	/**
	 * Checks the sign-in SMS code and starts the session.
	 *
	 * Returns:
	 * - Ok(undefined) when signed in
	 * - Err(INVALID_OTP) / Err(OTP_EXPIRED) / Err(TOO_MANY_ATTEMPTS) for the code
	 * - Err(ACCOUNT_LOCKED) after repeated failures
	 * - Err(INVALID_TWO_FACTOR_COOKIE) if the password step wasn't done or expired
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(VERIFY_FAILED) on anything else
	 */
	verifyTwoFactorOtp: async (code: string, headers: Headers) => {
		try {
			await auth.api.verifyTwoFactorOTP({ headers, body: { code } });
			return ok(undefined);
		} catch (error) {
			const errorCode = codeOf(error);
			if (errorCode === 'INVALID_CODE') return err('INVALID_OTP' as const);
			if (errorCode === 'OTP_HAS_EXPIRED') return err('OTP_EXPIRED' as const);
			if (errorCode === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE') return err('TOO_MANY_ATTEMPTS' as const);
			if (errorCode === 'ACCOUNT_TEMPORARILY_LOCKED') return err('ACCOUNT_LOCKED' as const);
			if (errorCode === 'INVALID_TWO_FACTOR_COOKIE') return err('INVALID_TWO_FACTOR_COOKIE' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('VERIFY_FAILED' as const);
		}
	},
	// #endif
	// #if phone

	/**
	 * Sends a phone verification code (registration, or sign-in with phone OTP).
	 *
	 * Returns:
	 * - Ok({ remainingSeconds }) until a new code may be requested
	 * - Err(INVALID_PHONE_NUMBER) if the number isn't an Iranian mobile
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(SEND_FAILED) on anything else
	 */
	sendPhoneOtp: async (phoneNumber: string, headers: Headers) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		try {
			await auth.api.sendPhoneNumberOTP({ headers, body: { phoneNumber: phone } });
			return ok({ remainingSeconds: OTP_EXPIRES_IN_SECONDS });
		} catch (error) {
			const code = codeOf(error);
			if (code === 'INVALID_PHONE_NUMBER') return err('INVALID_PHONE_NUMBER' as const);
			if (code === 'OTP_COOLDOWN') return ok({ remainingSeconds: remainingSecondsOf(error) });
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('SEND_FAILED' as const);
		}
	},

	/**
	 * Checks a phone verification code. On a number with no account yet, this creates the account
	 * (`signUpOnVerification`) and signs it in.
	 *
	 * Returns:
	 * - Ok(user) with the verified, signed-in user
	 * - Err(INVALID_PHONE_NUMBER) if the number isn't an Iranian mobile
	 * - Err(INVALID_OTP) / Err(OTP_EXPIRED) / Err(OTP_NOT_FOUND) / Err(TOO_MANY_ATTEMPTS) for the code
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(VERIFY_FAILED) on anything else
	 */
	verifyPhoneOtp: async (phoneNumber: string, code: string, headers: Headers) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		try {
			const result = await auth.api.verifyPhoneNumber({ headers, body: { phoneNumber: phone, code } });
			return ok(result.user);
		} catch (error) {
			const errorCode = codeOf(error);
			if (errorCode === 'INVALID_OTP') return err('INVALID_OTP' as const);
			if (errorCode === 'OTP_EXPIRED') return err('OTP_EXPIRED' as const);
			if (errorCode === 'OTP_NOT_FOUND') return err('OTP_NOT_FOUND' as const);
			if (errorCode === 'TOO_MANY_ATTEMPTS') return err('TOO_MANY_ATTEMPTS' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('VERIFY_FAILED' as const);
		}
	},
	// #endif
	// #if phone,!login-phone-otp

	/**
	 * Step 1 of registration: checks the account doesn't exist yet, then sends the phone code.
	 *
	 * Returns:
	 * - Ok({ remainingSeconds }) until a new code may be requested
	 * - Err(USERNAME_TAKEN) / Err(PHONE_TAKEN) if an account already uses them
	 * - the errors of `sendPhoneOtp`
	 * - Err(DB_ERROR) if a lookup fails
	 */
	sendRegisterOtp: async (
		username: string, // @if login-username
		phoneNumber: string,
		headers: Headers
	) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		const byUsername = await UserQuery.findByUsername(username.toLowerCase()); // @if login-username
		if (byUsername.isErr()) return err(byUsername.error); // @if login-username
		if (byUsername.value) return err('USERNAME_TAKEN' as const); // @if login-username
		const byPhone = await UserQuery.findByPhoneNumber(phone);
		if (byPhone.isErr()) return err(byPhone.error);
		if (byPhone.value) return err('PHONE_TAKEN' as const);

		return AuthService.sendPhoneOtp(phone, headers);
	},

	/**
	 * Step 2 of registration: verifies the phone code, which creates the account, then gives it its
	 * password (and username).
	 *
	 * Flow:
	 * 1. Re-checks that nothing took the username or phone since step 1.
	 * 2. Verifies the code; better-auth creates the user and signs it in.
	 * 3. Refuses to touch an account this call didn't just create.
	 * 4. Attaches the credential (password) account. // @if !login-username
	 * 4. Sets the username and attaches the credential (password) account. // @if login-username
	 *
	 * Returns:
	 * - Ok(undefined) when the account is ready and signed in
	 * - Err(USERNAME_TAKEN) / Err(PHONE_TAKEN) if an account already uses them
	 * - the errors of `verifyPhoneOtp`
	 * - Err(REGISTRATION_CONFLICT) if the phone already belonged to an account
	 * - Err(ACCOUNT_FINALIZE_FAILED) if the password couldn't be attached
	 * - Err(DB_ERROR) if a lookup fails
	 */
	completeRegistration: async (
		username: string, // @if login-username
		phoneNumber: string,
		code: string,
		password: string,
		headers: Headers
	) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		const byUsername = await UserQuery.findByUsername(username.toLowerCase()); // @if login-username
		if (byUsername.isErr()) return err(byUsername.error); // @if login-username
		if (byUsername.value) return err('USERNAME_TAKEN' as const); // @if login-username
		const byPhone = await UserQuery.findByPhoneNumber(phone);
		if (byPhone.isErr()) return err(byPhone.error);
		if (byPhone.value) return err('PHONE_TAKEN' as const);

		const verified = await AuthService.verifyPhoneOtp(phone, code, headers);
		if (verified.isErr()) return err(verified.error);
		const user = verified.value;

		// The phone was free a moment ago; if verify returned an older account, it was claimed in
		// between. Never attach a password to an account this call didn't create.
		const credentials = await UserQuery.hasCredentialAccount(user.id);
		if (credentials.isErr()) return err(credentials.error);
		if (credentials.value) return err('REGISTRATION_CONFLICT' as const);

		try {
			const ctx = await auth.$context;
			await ctx.internalAdapter.updateUser(user.id, { username: username.toLowerCase(), displayUsername: username }); // @if login-username
			await ctx.internalAdapter.createAccount({
				userId: user.id,
				providerId: 'credential',
				accountId: user.id,
				password: await ctx.password.hash(password)
			});
			return ok(undefined);
		} catch (error) {
			console.error('Attaching the password after phone verification failed:', user.id, error);
			return err('ACCOUNT_FINALIZE_FAILED' as const);
		}
	},

	/**
	 * Sends a password reset code to the phone.
	 *
	 * Returns:
	 * - Ok({ remainingSeconds }) until a new code may be requested
	 * - Err(INVALID_PHONE_NUMBER) if the number isn't an Iranian mobile
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(SEND_FAILED) on anything else
	 *
	 * Notes:
	 * - Succeeds for unknown numbers too, so it can't be used to find accounts.
	 */
	sendPasswordResetOtp: async (phoneNumber: string, headers: Headers) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		try {
			await auth.api.requestPasswordResetPhoneNumber({ headers, body: { phoneNumber: phone } });
			return ok({ remainingSeconds: OTP_EXPIRES_IN_SECONDS });
		} catch (error) {
			if (codeOf(error) === 'OTP_COOLDOWN') return ok({ remainingSeconds: remainingSecondsOf(error) });
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('SEND_FAILED' as const);
		}
	},

	/**
	 * Sets a new password with the reset code. Signs the account out everywhere.
	 *
	 * Returns:
	 * - Ok(undefined)
	 * - Err(INVALID_PHONE_NUMBER) if the number isn't an Iranian mobile
	 * - Err(INVALID_OTP) / Err(OTP_EXPIRED) / Err(OTP_NOT_FOUND) / Err(TOO_MANY_ATTEMPTS) for the code
	 * - Err(RATE_LIMITED) on too many requests
	 * - Err(RESET_FAILED) on anything else
	 */
	resetPassword: async (phoneNumber: string, code: string, newPassword: string, headers: Headers) => {
		const phone = Phone.normalize(phoneNumber);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		try {
			await auth.api.resetPasswordPhoneNumber({ headers, body: { phoneNumber: phone, otp: code, newPassword } });
			return ok(undefined);
		} catch (error) {
			const errorCode = codeOf(error);
			if (errorCode === 'INVALID_OTP') return err('INVALID_OTP' as const);
			if (errorCode === 'OTP_EXPIRED') return err('OTP_EXPIRED' as const);
			if (errorCode === 'OTP_NOT_FOUND') return err('OTP_NOT_FOUND' as const);
			if (errorCode === 'TOO_MANY_ATTEMPTS') return err('TOO_MANY_ATTEMPTS' as const);
			if (isRateLimited(error)) return err('RATE_LIMITED' as const);
			return err('RESET_FAILED' as const);
		}
	},
	// #endif
};
