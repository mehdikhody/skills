// #file-if roles-db
import type { NewRole, NewRolePermission } from '#db/schema/role.schema.ts';
import { eq } from 'drizzle-orm';
import { err, ok } from 'neverthrow';
import { db } from '#db';
import { RolePermissionTable, RoleTable } from '#db/schema/role.schema.ts';

export const RoleQuery = {
	/**
	 * Lists the stored permission rules of one role.
	 *
	 * Returns:
	 * - Ok(RolePermission[]) (empty for an unknown role)
	 * - Err(DB_ERROR) if the query fails
	 */
	findRules: async (roleId: string) => {
		try {
			const rules = await db
				.select()
				.from(RolePermissionTable)
				.where(eq(RolePermissionTable.roleId, roleId));
			return ok(rules);
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Counts the roles.
	 *
	 * Returns:
	 * - Ok(number)
	 * - Err(DB_ERROR) if the query fails
	 */
	count: async () => {
		try {
			return ok(await db.$count(RoleTable));
		} catch {
			return err('DB_ERROR' as const);
		}
	},

	/**
	 * Inserts roles and their rules.
	 *
	 * Flow:
	 * 1. Inserts every role in one statement.
	 * 2. Inserts every rule in one statement.
	 *
	 * Returns:
	 * - Ok(undefined)
	 * - Err(DB_ERROR) if an insert fails
	 *
	 * Notes:
	 * - Two statements, not a transaction (SQLite's driver can't run async transactions). A
	 *   failure between them leaves roles without rules; the caller only seeds an empty table.
	 */
	insertMany: async (roles: NewRole[], rules: NewRolePermission[]) => {
		try {
			if (roles.length) await db.insert(RoleTable).values(roles);
			if (rules.length) await db.insert(RolePermissionTable).values(rules);
			return ok(undefined);
		} catch {
			return err('DB_ERROR' as const);
		}
	}
};
