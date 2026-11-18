// #file-if phone,!login-phone-otp
import { error, invalid } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { PasswordResetOtpSchema, PasswordResetSchema } from '#lib/schema/user.schema.ts';
import { AuthService } from '#services/auth.service.ts';

// Messages are plain strings for now; move them to Paraglide messages when building the page.

/** Password reset step 1: send the SMS code. */
export const sendPasswordResetOtp = form(PasswordResetOtpSchema, async ({ phoneNumber }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.sendPasswordResetOtp(phoneNumber, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many requests, try again later');
		error(500, 'Could not send the code');
	}

	return result.value;
});

/** Password reset step 2: verify the code and set the new password. */
export const resetPassword = form(PasswordResetSchema, async ({ phoneNumber, code, password }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.resetPassword(phoneNumber, code, password, request.headers);
	if (result.isErr()) {
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'INVALID_OTP') invalid(issue.code('Wrong code'));
		if (result.error === 'OTP_EXPIRED' || result.error === 'OTP_NOT_FOUND') {
			invalid(issue.code('The code expired, ask for a new one'));
		}
		if (result.error === 'TOO_MANY_ATTEMPTS') invalid(issue.code('Too many tries, ask for a new code'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not reset the password');
	}
});
