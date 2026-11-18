// #file-if phone
import { err, ok } from 'neverthrow';
import { dev } from '$app/env';
import { SMS_TRANSPORT } from '$app/env/private';
import { Phone } from '#lib/phone-number.ts';
import { FarazsmsService } from '#services/farazsms.service.ts';

export const OTPService = {
	/**
	 * Sends a one-time verification code to a phone number.
	 *
	 * Flow:
	 * 1. Normalizes the phone number to its canonical form.
	 * 2. Picks the transport from SMS_TRANSPORT: `console` (development default) logs the code,
	 *    `farazsms` (production default) sends it through `FarazsmsService`.
	 *
	 * Returns:
	 * - Ok(undefined) once the code is logged or sent
	 * - Err(INVALID_PHONE_NUMBER) if the number is not a valid Iranian mobile
	 * - Err(SMS_NOT_CONFIGURED | SMS_REFUSED | SMS_FAILED) from `FarazsmsService.send`
	 */
	send: async (to: string, code: string) => {
		const phone = Phone.normalize(to);
		if (!phone) return err('INVALID_PHONE_NUMBER' as const);

		const transport = SMS_TRANSPORT ?? (dev ? 'console' : 'farazsms');
		if (transport === 'console') {
			console.info(`[otp:console] code for ${phone}: ${code}`);
			return ok(undefined);
		}

		return FarazsmsService.send({ to: phone, pattern: 'verification-code', values: { code } });
	}
};
