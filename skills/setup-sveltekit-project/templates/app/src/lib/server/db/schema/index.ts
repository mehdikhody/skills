// #file-if db
// Every table and relation, for `drizzle(client, { schema })`. Add each new schema file here.
export {}; // @if !auth
export * from './account.schema.ts'; // @if auth
export * from './post.schema.ts'; // @if auth
export * from './relations.schema.ts'; // @if auth
export * from './role.schema.ts'; // @if roles-db
export * from './session.schema.ts'; // @if auth
export * from './two-factor.schema.ts'; // @if two-factor
export * from './user.schema.ts'; // @if auth
export * from './verification.schema.ts'; // @if auth
