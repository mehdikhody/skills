import { phoneNumberClient, twoFactorClient, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	plugins: [usernameClient(), phoneNumberClient(), twoFactorClient()]
});
