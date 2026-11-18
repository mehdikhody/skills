// #file-if phone
/** An Iranian mobile number in canonical E.164 form, e.g. +989121234567. */
export type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const Phone = {
	/** Replaces Persian and Arabic digits with Latin ones. */
	toLatinDigits: (input: string) =>
		input.replace(/[۰-۹٠-٩]/g, (digit) =>
			String(Math.max(PERSIAN_DIGITS.indexOf(digit), ARABIC_DIGITS.indexOf(digit)))
		),

	/**
	 * Turns what people type (Persian or Arabic digits, spaces, dashes, and the 09…, 9…, 989…,
	 * 00989… and +989… forms) into a canonical PhoneNumber, or null if it isn't an Iranian mobile.
	 */
	normalize: (input: string): PhoneNumber | null => {
		const digits = Phone.toLatinDigits(input).replace(/[\s\-().‌]/g, '');
		const match = /^(?:\+98|0098|98|0)?(9\d{9})$/.exec(digits);
		return match ? (`+98${match[1]}` as PhoneNumber) : null;
	},

	/** The local form SMS providers and people use: 09121234567. */
	toLocal: (phoneNumber: PhoneNumber) => `0${phoneNumber.slice(3)}`,

	/** For showing where a code went without revealing the number: 0912***4567. */
	mask: (phoneNumber: PhoneNumber) => {
		const local = Phone.toLocal(phoneNumber);
		return `${local.slice(0, 4)}***${local.slice(-4)}`;
	},

	/**
	 * better-auth requires an email on every user; phone-first accounts get this placeholder
	 * (never mailed) so the column stays unique.
	 */
	placeholderEmail: (phoneNumber: PhoneNumber) => `${phoneNumber.slice(1)}@phone.invalid`
};
