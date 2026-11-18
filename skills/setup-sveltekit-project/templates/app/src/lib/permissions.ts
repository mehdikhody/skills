// #file-if permissions
import type { MongoAbility, RawRuleOf } from '@casl/ability'; // @if roles-db
import type { MongoAbility } from '@casl/ability'; // @if roles-hardcoded
import type { Post } from '#db/schema/post.schema.ts'; // @if demo
import type { UserRole } from '#lib/schema/user.schema.ts'; // @if roles-hardcoded
import { AbilityBuilder, createMongoAbility } from '@casl/ability'; // @if roles-hardcoded
import { createMongoAbility } from '@casl/ability'; // @if roles-db

type UserSubject = { id: string; role?: string | null };
type PostSubject = Pick<Post, 'authorId' | 'status'>; // @if demo

// Add an `[action, subject]` tuple here for every action and subject the code checks.
export type Permissions = MongoAbility<
	| ['access', 'admin']
	| ['create' | 'read' | 'update' | 'delete', PostSubject | 'post'] // @if demo
>;

// #if roles-hardcoded
// #if demo
/** Anonymous requests: published posts only. */
export const defineGuestPermissions = () => {
	const { build, can } = new AbilityBuilder<Permissions>(createMongoAbility);

	can('read', 'post', { status: 'PUBLISHED' });

	return build();
};
// #else
/** Anonymous requests: nothing yet. Add rules here as entities appear. */
export const defineGuestPermissions = () => {
	const { build } = new AbilityBuilder<Permissions>(createMongoAbility);

	return build();
};
// #endif

export const definePermissionsFor = (user: UserSubject) => {
	const { build, can } = new AbilityBuilder<Permissions>(createMongoAbility);
	const role = (user.role ?? 'USER') as UserRole;

	// #if demo
	can('read', 'post', { status: 'PUBLISHED' });
	can('create', 'post');
	can(['read', 'update', 'delete'], 'post', { authorId: user.id });

	// #endif
	if (role === 'ADMIN') {
		can('access', 'admin');
		can(['read', 'update', 'delete'], 'post'); // @if demo
	}

	return build();
};
// #endif
// #if roles-db
/** One stored rule, as CASL reads it. Roles and their rules live in the `role` tables. */
export type PermissionRule = RawRuleOf<Permissions>;

const PLACEHOLDER = /^\$\{user\.(id|role)\}$/;

/** Replaces `${user.id}` / `${user.role}` strings anywhere inside a rule's conditions. */
const fill = (value: unknown, user?: UserSubject): unknown => {
	if (typeof value === 'string') {
		const match = PLACEHOLDER.exec(value);
		if (!match) return value;
		// No user means the rule can't match anyone: an id no row has.
		return match[1] === 'id' ? (user?.id ?? '\u0000') : (user?.role ?? '\u0000');
	}
	if (Array.isArray(value)) return value.map((item) => fill(item, user));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fill(item, user)]));
	}
	return value;
};

/** Builds the ability for a request from its role's stored rules. */
export const buildPermissions = (rules: PermissionRule[], user?: UserSubject) =>
	createMongoAbility<Permissions>(
		rules.map((rule) =>
			rule.conditions ? ({ ...rule, conditions: fill(rule.conditions, user) } as PermissionRule) : rule
		)
	);

/** Allows nothing; used when the rules can't be loaded. */
export const emptyPermissions = () => createMongoAbility<Permissions>([]);
// #endif
