// #file-if roles-db
import type { NewRolePermission, RolePermission } from '#db/schema/role.schema.ts';
import type { PermissionRule } from '#lib/permissions.ts';
import { err, ok } from 'neverthrow';
import { RoleQuery } from '#db/query/role.query.ts';
import { buildPermissions } from '#lib/permissions.ts';
import { GUEST_ROLE_ID } from '#lib/schema/role.schema.ts';

/** How long a role's rules are reused before they're read again. */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { rules: PermissionRule[]; expiresAt: number }>();

type DefaultRole = {
	id: string;
	name: string;
	description: string;
	rules: Omit<NewRolePermission, 'roleId'>[];
};

/** Seeded into an empty database; edit them in the database afterwards. */
const DEFAULT_ROLES: DefaultRole[] = [
	{
		id: GUEST_ROLE_ID,
		name: 'Guest',
		description: 'Anonymous visitors',
		rules: [{ action: 'read', subject: 'post', conditions: { status: 'PUBLISHED' } }] // @if demo
		rules: [] // @if !demo
	},
	{
		id: 'USER',
		name: 'User',
		description: 'Every signed-up account',
		// #if demo
		rules: [
			{ action: 'read', subject: 'post', conditions: { status: 'PUBLISHED' } },
			{ action: 'create', subject: 'post' },
			{ action: 'read', subject: 'post', conditions: { authorId: '${user.id}' } },
			{ action: 'update', subject: 'post', conditions: { authorId: '${user.id}' } },
			{ action: 'delete', subject: 'post', conditions: { authorId: '${user.id}' } }
		]
		// #else
		rules: []
		// #endif
	},
	{
		id: 'ADMIN',
		name: 'Admin',
		description: 'Full access',
		// #if demo
		rules: [
			{ action: 'access', subject: 'admin' },
			{ action: 'create', subject: 'post' },
			{ action: 'read', subject: 'post' },
			{ action: 'update', subject: 'post' },
			{ action: 'delete', subject: 'post' }
		]
		// #else
		rules: [{ action: 'access', subject: 'admin' }]
		// #endif
	}
];

const toRule = (row: RolePermission): PermissionRule =>
	({
		action: row.action,
		subject: row.subject,
		...(row.fields ? { fields: row.fields } : {}),
		...(row.conditions ? { conditions: row.conditions } : {}),
		inverted: row.inverted,
		...(row.reason ? { reason: row.reason } : {})
	}) as PermissionRule;

export const PermissionService = {
	/**
	 * Builds the request's ability from its role's stored rules.
	 *
	 * Flow:
	 * 1. Picks the user's role, or the guest role when anonymous.
	 * 2. Reads that role's rules (cached for a minute).
	 * 3. Fills `${user.id}` / `${user.role}` placeholders in their conditions.
	 *
	 * Returns:
	 * - Ok(Permissions)
	 * - Err(DB_ERROR) if the rules can't be read
	 */
	forUser: async (user?: { id: string; role?: string | null }) => {
		const roleId = user?.role ?? GUEST_ROLE_ID;

		const cached = cache.get(roleId);
		if (cached && cached.expiresAt > Date.now()) return ok(buildPermissions(cached.rules, user));

		const rows = await RoleQuery.findRules(roleId);
		if (rows.isErr()) return err(rows.error);

		const rules = rows.value.map(toRule);
		cache.set(roleId, { rules, expiresAt: Date.now() + CACHE_TTL_MS });
		return ok(buildPermissions(rules, user));
	},

	/** Drops cached rules (one role, or all) after they change in the database. */
	invalidate: (roleId?: string) => {
		if (roleId) cache.delete(roleId);
		else cache.clear();
	},

	/**
	 * Seeds the default roles into an empty database.
	 *
	 * Returns:
	 * - Ok(true) if it seeded, Ok(false) if roles already existed
	 * - Err(DB_ERROR) if a query fails
	 */
	seedDefaults: async () => {
		const count = await RoleQuery.count();
		if (count.isErr()) return err(count.error);
		if (count.value > 0) return ok(false);

		const seeded = await RoleQuery.insertMany(
			DEFAULT_ROLES.map(({ id, name, description }) => ({ id, name, description })),
			DEFAULT_ROLES.flatMap((role) => role.rules.map((rule) => ({ ...rule, roleId: role.id })))
		);
		if (seeded.isErr()) return err(seeded.error);

		console.info('Seeded default roles:', DEFAULT_ROLES.map((role) => role.id).join(', '));
		return ok(true);
	}
};
