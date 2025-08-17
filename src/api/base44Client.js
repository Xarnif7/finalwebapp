import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6894e7489cd78593608da10a", 
  requiresAuth: true // Ensure authentication is required for all operations
});

