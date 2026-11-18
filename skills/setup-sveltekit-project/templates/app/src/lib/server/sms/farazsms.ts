// #file-if phone
import type { SmsMessage } from './sms.ts';
import { err, ok } from 'neverthrow';
import { Phone } from '#lib/phone-number.ts';

export type FarazSmsConfig = {
	apiKey: string;
	/** The sender line, from GET /ws/v1/lines/accessible. */
	lineNumber: string;
	/** The approved pattern code for each SMS pattern the app sends. */
	patterns: Record<SmsMessage['pattern'], string>;
	baseUrl?: string;
};

export const FARAZSMS_BASE_URL = 'https://api.iranpayamak.com';

export const FarazSms = {
	/**
	 * Sends one pattern SMS through FarazSMS (IranPayamak): POST /ws/v1/sms/pattern with the
	 * pattern's variables as `attributes`. Every pattern must be approved in the FarazSMS panel.
	 */
	send: async (config: FarazSmsConfig, message: SmsMessage) => {
		try {
			const response = await fetch(`${config.baseUrl ?? FARAZSMS_BASE_URL}/ws/v1/sms/pattern`, {
				method: 'POST',
				headers: {
					'Api-Key': config.apiKey,
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					code: config.patterns[message.pattern],
					recipient: Phone.toLocal(message.to),
					line_number: config.lineNumber,
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
