// #file-if auth
import { z } from 'zod';

// #if roles-hardcoded
export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// #endif
// #if !login-phone-otp
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// #endif
// #if phone
export const OTP_LENGTH = 5;
export const OTP_EXPIRES_IN_SECONDS = 120;

// #endif
// #if username
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

// #endif
// Field schemas shared by the auth forms below.
const password = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH); // @if !login-phone-otp
// Normalised and validated by the Service (Iranian mobile, any common form), not here.
const phoneNumber = z.string().trim().min(1).max(20); // @if phone
const otp = z.string().length(OTP_LENGTH).regex(/^\d+$/); // @if phone
const username = z.string().trim().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH).regex(USERNAME_REGEX); // @if username

// #if login-username
export const LoginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export const TwoFactorVerifySchema = z.object({ code: otp });
export const RegisterOtpSchema = z.object({ username, phoneNumber });
export const RegisterSchema = z.object({ username, phoneNumber, code: otp, password });
// #endif
// #if login-phone-password
export const LoginSchema = z.object({ phoneNumber, password: z.string().min(1) });
export const RegisterOtpSchema = z.object({ phoneNumber });
export const RegisterSchema = z.object({ phoneNumber, code: otp, password });
// #endif
// #if phone,!login-phone-otp
export const PasswordResetOtpSchema = z.object({ phoneNumber });
export const PasswordResetSchema = z.object({ phoneNumber, code: otp, password });
// #endif
// #if login-phone-otp
export const LoginOtpSchema = z.object({ phoneNumber });
export const LoginVerifySchema = z.object({ phoneNumber, code: otp });
// #endif
// #if login-email
export const LoginSchema = z.object({ email: z.email(), password: z.string().min(1) });
export const RegisterSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.email(), password });
// #endif
