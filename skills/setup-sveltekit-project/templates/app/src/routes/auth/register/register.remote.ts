// #file-if auth,!login-phone-otp
import { error, invalid } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import {
	RegisterOtpSchema, // @if phone
	RegisterSchema,
} from '#lib/schema/user.schema.ts';
import { AuthService } from '#services/auth.service.ts';

// Messages are plain strings for now; move them to Paraglide messages when building the page.
// #if login-email

export const register = form(RegisterSchema, async ({ name, email, password }, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.register(name, email, password, request.headers);
	if (result.isErr()) {
		if (result.error === 'EMAIL_TAKEN') invalid(issue.email('An account already uses this email'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not create the account');
	}
});
// #endif
// #if phone

/** Registration step 1: check the account is new and send the SMS code. */
export const sendRegisterOtp = form(RegisterOtpSchema, async (data, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.sendRegisterOtp(data.username, data.phoneNumber, request.headers); // @if login-username
	const result = await AuthService.sendRegisterOtp(data.phoneNumber, request.headers); // @if !login-username
	if (result.isErr()) {
		if (result.error === 'USERNAME_TAKEN') invalid(issue.username('This username is taken')); // @if login-username
		if (result.error === 'PHONE_TAKEN') invalid(issue.phoneNumber('An account already uses this number'));
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'RATE_LIMITED') error(429, 'Too many requests, try again later');
		error(500, 'Could not send the code');
	}

	return result.value;
});

/** Registration step 2: verify the code and set the password. Signs the new account in. */
export const register = form(RegisterSchema, async (data, issue) => {
	const { request } = getRequestEvent();
	const result = await AuthService.completeRegistration( // @if login-username
		data.username, // @if login-username
		data.phoneNumber, // @if login-username
		data.code, // @if login-username
		data.password, // @if login-username
		request.headers // @if login-username
	); // @if login-username
	const result = await AuthService.completeRegistration(data.phoneNumber, data.code, data.password, request.headers); // @if !login-username
	if (result.isErr()) {
		if (result.error === 'USERNAME_TAKEN') invalid(issue.username('This username is taken')); // @if login-username
		if (result.error === 'PHONE_TAKEN') invalid(issue.phoneNumber('An account already uses this number'));
		if (result.error === 'INVALID_PHONE_NUMBER') invalid(issue.phoneNumber('Enter an Iranian mobile number'));
		if (result.error === 'INVALID_OTP') invalid(issue.code('Wrong code'));
		if (result.error === 'OTP_EXPIRED' || result.error === 'OTP_NOT_FOUND') {
			invalid(issue.code('The code expired, ask for a new one'));
		}
		if (result.error === 'TOO_MANY_ATTEMPTS') invalid(issue.code('Too many tries, ask for a new code'));
		if (result.error === 'REGISTRATION_CONFLICT') error(409, 'This number was just registered, sign in instead');
		if (result.error === 'RATE_LIMITED') error(429, 'Too many attempts, try again later');
		error(500, 'Could not create the account');
	}
});
// #endif
