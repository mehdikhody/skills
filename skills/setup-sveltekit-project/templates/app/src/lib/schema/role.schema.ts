// #file-if roles-db
/** Role every anonymous request gets its rules from. */
export const GUEST_ROLE_ID = 'GUEST';
/** Role new accounts get. */
export const DEFAULT_USER_ROLE_ID = 'USER';

/**
 * Placeholders allowed inside a stored rule's `conditions`, filled per request from the signed-in
 * user, e.g. `{ "authorId": "${user.id}" }`.
 */
export const RULE_PLACEHOLDERS = ['${user.id}', '${user.role}'] as const;
