// #file-if auth
import { error, invalid } from '@sveltejs/kit';
import {
	command, // @if login-username
	form,
	getRequestEvent,
} from '$app/server';
import {
	LoginOtpSchema, // @if login-phone-otp
	LoginSchema, // @if !login-phone-otp
	LoginVerifySchema, // @if login-phone-otp
	TwoFactorVerifySchema, // @if two-factor
} from '#lib/schema/user.schema.ts';
import { AuthService } from '#services/auth.service.ts';

// Messages are plain strings for now; move them to Paraglide messages when building the page.
// #if login-username

/** Step 1 of sign-in. On success the client asks for the SMS code (`verifyTwoFactor`). */
export const login = form(LoginSchema, async ({ username, password }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.loginWithPassword(username, password, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_CREDENTIALS') {
			invalid(issue.username('Wrong username or password'), issue.password('Wrong username or password'));
		}
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not sign in');
	}

	return result.value;
});

export const resendTwoFactorOtp = command(async () => {
	const { request } = getRequestEvent();
	const result = await AuthService.sendTwoFactorOtp(request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_TWO_FACTOR_COOKIE') error(400, 'Sign in again');
		if (result.error === 'RATE_LIMITED') error(429, 'Too many requests, try again later');
		error(500, 'Could not send the code');
	}

	return result.value;
});

/** Step 2 of sign-in: the SMS code. Starts the session. */
export const verifyTwoFactor = form(TwoFactorVerifySchema, async ({ code }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.verifyTwoFactorOtp(code, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_OTP') invalid(issue.code('Wrong code'));
		if (result.error === 'OTP_EXPIRED') invalid(issue.code('The code expired, ask for a new one'));
		if (result.error === 'TOO_MANY_ATTEMPTS') invalid(issue.code('Too many tries, ask for a new code'));
		if (result.error === 'ACCOUNT_LOCKED') error(423, 'Account temporarily locked');
		if (result.error === 'INVALID_TWO_FACTOR_COOKIE') error(400, 'Sign in again');
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not verify the code');
	}
});
// #endif
// #if login-phone-password

export const login = form(LoginSchema, async ({ phoneNumber, password }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.loginWithPassword(phoneNumber, password, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'INVALID_CREDENTIALS') {
			invalid(issue.phoneNumber('Wrong number or password'), issue.password('Wrong number or password'));
		}
		if (result.error === 'PHONE_NOT_VERIFIED') error(403, 'Verify your phone number first');
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not sign in');
	}
});
// #endif
// #if login-email

export const login = form(LoginSchema, async ({ email, password }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.loginWithPassword(email, password, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_CREDENTIALS') {
			invalid(issue.email('Wrong email or password'), issue.password('Wrong email or password'));
		}
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not sign in');
	}
});
// #endif
// #if login-phone-otp

/** Sign-in step 1: send the SMS code. */
export const sendLoginOtp = form(LoginOtpSchema, async ({ phoneNumber }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.sendPhoneOtp(phoneNumber, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many requests, try again later');
		error(500, 'Could not send the code');
	}

	return result.value;
});

/** Sign-in step 2: check the code. Creates the account on a first sign-in. */
export const verifyLoginOtp = form(LoginVerifySchema, async ({ phoneNumber, code }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.verifyPhoneOtp(phoneNumber, code, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'INVALID_OTP') invalid(issue.code('Wrong code'));
		if (result.error === 'OTP_EXPIRED' || result.error === 'OTP_NOT_FOUND') {
			invalid(issue.code('The code expired, ask for a new one'));
		}
		if (result.error === 'TOO_MANY_ATTEMPTS') invalid(issue.code('Too many tries, ask for a new code'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not verify the code');
	}
});
// #endif
