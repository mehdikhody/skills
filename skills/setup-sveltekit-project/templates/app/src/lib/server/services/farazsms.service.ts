// #file-if phone
import type { PhoneNumber } from '#lib/phone-number.ts';
import { err, ok } from 'neverthrow';
import {
	FARAZSMS_API_KEY,
	FARAZSMS_LINE_NUMBER,
	FARAZSMS_PATTERN_VERIFICATION_CODE
} from '$app/env/private';
import { Phone } from '#lib/phone-number.ts';

const FARAZSMS_BASE_URL = 'https://api.iranpayamak.com';

/** Pattern templates; each must be approved in the FarazSMS panel. */
export const FARAZSMS_PATTERNS = ['verification-code'] as const;
export type FarazsmsPattern = (typeof FARAZSMS_PATTERNS)[number];

export type FarazsmsMessage = {
	to: PhoneNumber;
	pattern: FarazsmsPattern;
	values: Record<string, string>;
};

export const FarazsmsService = {
	/**
	 * Sends one pattern SMS through FarazSMS (IranPayamak).
	 *
	 * Flow:
	 * 1. Reads the API key, sender line and pattern code from the FARAZSMS_* env vars.
	 * 2. POSTs /ws/v1/sms/pattern with the pattern's variables as `attributes`.
	 *
	 * Returns:
	 * - Ok(undefined) once FarazSMS accepts the SMS
	 * - Err(SMS_NOT_CONFIGURED) if a FARAZSMS_* variable is missing
	 * - Err(SMS_REFUSED) if FarazSMS answers with an error
	 * - Err(SMS_FAILED) if the request itself fails
	 *
	 * Notes:
	 * - The sender line comes from GET /ws/v1/lines/accessible.
	 */
	send: async (message: FarazsmsMessage) => {
		const patterns: Record<FarazsmsPattern, string | undefined> = {
			'verification-code': FARAZSMS_PATTERN_VERIFICATION_CODE
		};
		const patternCode = patterns[message.pattern];

		if (!FARAZSMS_API_KEY || !FARAZSMS_LINE_NUMBER || !patternCode) {
			console.error('FarazSMS is not configured: set the FARAZSMS_* variables in .env');
			return err('SMS_NOT_CONFIGURED' as const);
		}

		try {
			const response = await fetch(`${FARAZSMS_BASE_URL}/ws/v1/sms/pattern`, {
				method: 'POST',
				headers: {
					'Api-Key': FARAZSMS_API_KEY,
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					code: patternCode,
					recipient: Phone.toLocal(message.to),
					line_number: FARAZSMS_LINE_NUMBER,
					number_format: 'english',
					attributes: message.values
				})
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
	}
};
