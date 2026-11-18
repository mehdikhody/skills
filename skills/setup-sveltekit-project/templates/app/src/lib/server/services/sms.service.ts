// #file-if phone
import type { Result } from 'neverthrow';
import type { PhoneNumber } from '#lib/phone-number.ts';
import { err, ok } from 'neverthrow';
import { dev } from '$app/env';
import {
	FARAZSMS_API_KEY,
	FARAZSMS_LINE_NUMBER,
	FARAZSMS_PATTERN_VERIFICATION_CODE
} from '$app/env/private';
import { Phone } from '#lib/phone-number.ts';

/** Pattern templates the app sends; each sender maps them to its own approved template. */
export const SMS_PATTERNS = ['verification-code'] as const;
export type SmsPattern = (typeof SMS_PATTERNS)[number];

export type SmsMessage = {
	to: PhoneNumber;
	text: string;
};

export type SmsPatternMessage = {
	to: PhoneNumber;
	pattern: SmsPattern;
	values: Record<string, string>;
};

export type SmsError = 'SMS_NOT_CONFIGURED' | 'SMS_REFUSED' | 'SMS_FAILED';

/** What every SMS sender implements. Add a provider by writing another one. */
type SmsSender = {
	/** Sends a free-text SMS. */
	send: (message: SmsMessage) => Promise<Result<undefined, SmsError>>;
	/** Sends a pre-approved template with its variables filled in. */
	sendPattern: (message: SmsPatternMessage) => Promise<Result<undefined, SmsError>>;
};

const FARAZSMS_BASE_URL = 'https://api.iranpayamak.com';

/** The approved FarazSMS pattern code for each app pattern. */
const FARAZSMS_PATTERN_CODES: Record<SmsPattern, string | undefined> = {
	'verification-code': FARAZSMS_PATTERN_VERIFICATION_CODE
};

/** POSTs one request to the FarazSMS API; success means HTTP 2xx and `status: 'success'`. */
const farazsmsPost = async (path: string, body: Record<string, unknown>) => {
	if (!FARAZSMS_API_KEY || !FARAZSMS_LINE_NUMBER) {
		console.error('FarazSMS is not configured: set FARAZSMS_API_KEY and FARAZSMS_LINE_NUMBER in .env');
		return err('SMS_NOT_CONFIGURED' as const);
	}

	try {
		const response = await fetch(`${FARAZSMS_BASE_URL}${path}`, {
			method: 'POST',
			headers: {
				'Api-Key': FARAZSMS_API_KEY,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({ ...body, line_number: FARAZSMS_LINE_NUMBER, number_format: 'english' })
		});

		const result = (await response.json().catch(() => null)) as { status?: string } | null;
		if (!response.ok || result?.status !== 'success') {
			console.error('FarazSMS refused the SMS:', response.status, JSON.stringify(result));
			return err('SMS_REFUSED' as const);
		}

		return ok(undefined);
	} catch (error) {
		console.error('FarazSMS request failed:', error);
		return err('SMS_FAILED' as const);
	}
};

/**
 * FarazSMS (IranPayamak): free text through POST /ws/v1/sms/simple, patterns through
 * POST /ws/v1/sms/pattern. The sender line comes from GET /ws/v1/lines/accessible, and every
 * pattern must be approved in the FarazSMS panel.
 */
const FarazsmsSender = {
	send: async ({ to, text }) => {
		return farazsmsPost('/ws/v1/sms/simple', { text, recipients: [Phone.toLocal(to)] });
	},

	sendPattern: async ({ to, pattern, values }) => {
		const code = FARAZSMS_PATTERN_CODES[pattern];
		if (!code) {
			console.error(`FarazSMS has no pattern code for "${pattern}": set its FARAZSMS_PATTERN_* variable`);
			return err('SMS_NOT_CONFIGURED' as const);
		}

		return farazsmsPost('/ws/v1/sms/pattern', { code, recipient: Phone.toLocal(to), attributes: values });
	}
} satisfies SmsSender;

/** Development sender: prints each SMS to the server console instead of sending it. */
const ConsoleSender = {
	send: async ({ to, text }) => {
		console.info(`[sms:console] to ${to}: ${text}`);
		return ok(undefined);
	},

	sendPattern: async ({ to, pattern, values }) => {
		console.info(`[sms:console] to ${to} (${pattern}):`, values);
		return ok(undefined);
	}
} satisfies SmsSender;

/** FarazSMS once its API key and line are set; otherwise the console, in development only. */
const getSender = (): SmsSender | null => {
	if (FARAZSMS_API_KEY && FARAZSMS_LINE_NUMBER) return FarazsmsSender;
	if (dev) return ConsoleSender;

	console.error('SMS is not configured: set FARAZSMS_API_KEY and FARAZSMS_LINE_NUMBER in .env');
	return null;
};

export const SmsService = {
	/**
	 * Sends a free-text SMS.
	 *
	 * Flow:
	 * 1. Picks the sender: FarazSMS when FARAZSMS_API_KEY and FARAZSMS_LINE_NUMBER are set,
	 *    otherwise the console in development.
	 * 2. Hands the message to that sender.
	 *
	 * Returns:
	 * - Ok(undefined) once the SMS is sent or logged
	 * - Err(SMS_NOT_CONFIGURED) in production without FarazSMS settings
	 * - Err(SMS_REFUSED) if FarazSMS answers with an error
	 * - Err(SMS_FAILED) if the request itself fails
	 *
	 * Notes:
	 * - FarazSMS may queue free-text messages for review; use `sendPattern` for codes.
	 */
	send: async (message: SmsMessage) => {
		const sender = getSender();
		if (!sender) return err('SMS_NOT_CONFIGURED' as const);

		return sender.send(message);
	},

	/**
	 * Sends a pre-approved pattern SMS.
	 *
	 * Flow:
	 * 1. Picks the sender, as `send` does.
	 * 2. Hands the pattern and its values to that sender.
	 *
	 * Returns:
	 * - Ok(undefined) once the SMS is sent or logged
	 * - Err(SMS_NOT_CONFIGURED) in production without FarazSMS settings, or without the pattern's code
	 * - Err(SMS_REFUSED) if FarazSMS answers with an error
	 * - Err(SMS_FAILED) if the request itself fails
	 */
	sendPattern: async (message: SmsPatternMessage) => {
		const sender = getSender();
		if (!sender) return err('SMS_NOT_CONFIGURED' as const);

		return sender.sendPattern(message);
	},

	/**
	 * Sends a one-time verification code to a phone number.
	 *
	 * Flow:
	 * 1. Normalizes the phone number to its canonical form.
	 * 2. Sends the `verification-code` pattern through `sendPattern`.
	 *
	 * Returns:
	 * - Ok(undefined) once the code is sent or logged
	 * - Err(INVALID_PHONE_NUMBER) if the number is not a valid Iranian mobile
	 * - Err(SMS_NOT_CONFIGURED | SMS_REFUSED | SMS_FAILED) from `sendPattern`
	 */
	sendOtp: async (to: string, code: string) => {
		const phone = Phone.normalize(to);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		return SmsService.sendPattern({
			to: phone,
			pattern: 'verification-code',
			values: { code }
		});
	}
};
