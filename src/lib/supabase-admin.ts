import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to get authenticated user from JWT
export async function getAuthenticatedUser(authHeader: string) {
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid authentication token');
    }
    
    return user;
  } catch (error) {
    throw new Error('Authentication failed');
  }
}

// Helper function to get user's business_id from profile
export async function getUserBusinessId(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('business_id')
    .eq('user_id', userId)
    .single();
    
  if (error || !profile?.business_id) {
    throw new Error('User not associated with a business');
  }
  
  return profile.business_id;
}
