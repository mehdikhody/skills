// #file-if auth
import { and, eq } from 'drizzle-orm'; // @if phone,!login-phone-otp
import { eq } from 'drizzle-orm'; // @if !phone|login-phone-otp
import { err, ok } from 'neverthrow';
import { db } from '#db';
import { AccountTable } from '#db/schema/account.schema.ts'; // @if phone,!login-phone-otp
import { UserTable } from '#db/schema/user.schema.ts';

export const UserQuery = {
	/**
	 * Finds a user by id.
	 *
	 * Returns:
	 * - Ok(User) or Ok(null) if there is none
	 * - Err(DB_ERROR) if the query fails
	 */
	findById: async (id: string) => {
		try {
			const [user] = await db.select().from(UserTable).where(eq(UserTable.id, id)).limit(1);
			return ok(user ?? null);
		} catch {
			return err('DB_ERROR' as const);
		}
	},
	// #if username

	/**
	 * Finds a user by username (stored lowercase).
	 *
	 * Returns:
	 * - Ok(User) or Ok(null) if there is none
	 * - Err(DB_ERROR) if the query fails
	 */
	findByUsername: async (username: string) => {
		try {
			const [user] = await db
				.select()
				.from(UserTable)
				.where(eq(UserTable.username, username))
				.limit(1);
			return ok(user ?? null);
		} catch {
			return err('DB_ERROR' as const);
		}
	},
	// #endif
	// #if phone

	/**
	 * Finds a user by canonical phone number (+98…).
	 *
	 * Returns:
	 * - Ok(User) or Ok(null) if there is none
	 * - Err(DB_ERROR) if the query fails
	 */
	findByPhoneNumber: async (phoneNumber: string) => {
		try {
			const [user] = await db
				.select()
				.from(UserTable)
				.where(eq(UserTable.phoneNumber, phoneNumber))
				.limit(1);
			return ok(user ?? null);
		} catch {
			return err('DB_ERROR' as const);
		}
	},
	// #endif
	// #if phone,!login-phone-otp

	/**
	 * Whether the user already has a password (a `credential` account).
	 *
	 * Returns:
	 * - Ok(boolean)
	 * - Err(DB_ERROR) if the query fails
	 */
	hasCredentialAccount: async (userId: string) => {
		try {
			const [account] = await db
				.select({ id: AccountTable.id })
				.from(AccountTable)
				.where(and(eq(AccountTable.userId, userId), eq(AccountTable.providerId, 'credential')))
				.limit(1);
			return ok(Boolean(account));
		} catch {
			return err('DB_ERROR' as const);
		}
	},
	// #endif
};
