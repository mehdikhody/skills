import type { PhoneNumber } from '#lib/phone-number.ts';
import { err, ok } from 'neverthrow';
import { dev } from '$app/env';
import {
	FARAZSMS_API_KEY,
	FARAZSMS_LINE_NUMBER,
	FARAZSMS_PATTERN_VERIFICATION_CODE,
	SMS_TRANSPORT
} from '$app/env/private';
import { FarazSms } from './farazsms.ts';

/** Pattern templates; each must be approved in the FarazSMS panel. */
export const SMS_PATTERNS = ['verification-code'] as const;
export type SmsPattern = (typeof SMS_PATTERNS)[number];

export type SmsMessage = {
	to: PhoneNumber;
	pattern: SmsPattern;
	values: Record<string, string>;
};

export const Sms = {
	/**
	 * Sends an SMS through the transport chosen by SMS_TRANSPORT: `console` (development default)
	 * logs the message, `farazsms` (production default) sends it for real.
	 */
	send: async (message: SmsMessage) => {
		const transport = SMS_TRANSPORT ?? (dev ? 'console' : 'farazsms');

		if (transport === 'console') {
			console.info(`[sms:console] to ${message.to} (${message.pattern}):`, message.values);
			return ok(undefined);
		}

		if (!FARAZSMS_API_KEY || !FARAZSMS_LINE_NUMBER || !FARAZSMS_PATTERN_VERIFICATION_CODE) {
			console.error('FarazSMS is not configured: set the FARAZSMS_* variables in .env');
			return err('SMS_NOT_CONFIGURED' as const);
		}

		return FarazSms.send(
			{
				apiKey: FARAZSMS_API_KEY,
				lineNumber: FARAZSMS_LINE_NUMBER,
				patterns: { 'verification-code': FARAZSMS_PATTERN_VERIFICATION_CODE }
			},
			message
		);
	}
};
