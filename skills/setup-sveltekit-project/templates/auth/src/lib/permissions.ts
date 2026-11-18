import type { MongoAbility } from '@casl/ability';
import type { Post } from '#db/schema/post.schema.ts';
import type { UserRole } from '#lib/schema/user.schema.ts';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

type UserSubject = { id: string; role?: string | null };
type PostSubject = Pick<Post, 'authorId' | 'status'>;

type Permissions = MongoAbility<
	['access', 'admin'] | ['create' | 'read' | 'update' | 'delete', PostSubject | 'post']
>;

/** Anonymous requests: published posts only. */
export const defineGuestPermissions = () => {
	const { build, can } = new AbilityBuilder<Permissions>(createMongoAbility);

	can('read', 'post', { status: 'PUBLISHED' });

	return build();
};

export const definePermissionsFor = (user: UserSubject) => {
	const { build, can } = new AbilityBuilder<Permissions>(createMongoAbility);
	const role = (user.role ?? 'USER') as UserRole;

	can('read', 'post', { status: 'PUBLISHED' });
	can('create', 'post');
	can(['read', 'update', 'delete'], 'post', { authorId: user.id });

	if (role === 'ADMIN') {
		can('access', 'admin');
		can(['read', 'update', 'delete'], 'post');
	}

	return build();
};
