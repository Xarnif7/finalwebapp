import { createClient } from '@supabase/supabase-js';

// Runtime assertion for required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required - this will cause RLS bypass failures');
}

// Admin client with service role key (bypasses RLS)
export function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Get user's business_id from profiles table
export async function getUserBusinessId(userId: string): Promise<string | null> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[supabase] Error getting user business_id:', error);
    return null;
  }

  return data?.business_id || null;
}

// Get or create business by name (for Zapier fallback)
export async function getOrCreateBusinessByName(businessName: string): Promise<string> {
  const supabase = getAdminClient();
  
  // Try to find existing business
  const { data: existingBusiness, error: selectError } = await supabase
    .from('businesses')
    .select('id')
    .eq('name', businessName)
    .single();

  if (existingBusiness && !selectError) {
    return existingBusiness.id;
  }

  // Create new business if not found
  const { data: newBusiness, error: insertError } = await supabase
    .from('businesses')
    .insert({ name: businessName })
    .select('id')
    .single();

  if (insertError || !newBusiness) {
    console.error('[supabase] Error creating business:', insertError);
    throw new Error('Failed to create business');
  }

  return newBusiness.id;
}

// Create audit log entry
export async function createAuditLog(
  businessId: string,
  actor: string,
  action: string,
  payloadHash: string
): Promise<void> {
  const supabase = getAdminClient();
  
  const { error } = await supabase
    .from('audit_log')
    .insert({
      business_id: businessId,
      actor,
      action,
      payload_hash: payloadHash,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('[supabase] Error creating audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}
