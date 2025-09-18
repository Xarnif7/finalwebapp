import { createClient } from '@supabase/supabase-js';

let adminSupabase = null;

export function getAdminClient() {
  if (!adminSupabase) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return adminSupabase;
}

export async function getUserBusinessId(userId) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user business ID:', error);
    return null;
  }
  return data?.business_id || null;
}

export async function getOrCreateBusinessByName(name) {
  const supabase = getAdminClient();
  let { data: business, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error(`Error fetching business by name "${name}":`, error);
    throw new Error('Failed to fetch business');
  }

  if (!business) {
    // Insert with a placeholder created_by if the column exists and is NOT NULL
    const { data: newBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert({ 
        name, 
        created_by: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
        is_active: true,
        is_deleted: false,
        created_by_user_id: '00000000-0000-0000-0000-000000000000',
        created_by_user_email: 'system@example.com',
        created_by_user_name: 'System'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`Error creating business "${name}":`, insertError);
      throw new Error('Failed to create business');
    }
    business = newBusiness;
  }
  return business.id;
}

export async function createAuditLog(businessId, actor, action, payloadHash) {
  const supabase = getAdminClient();
  const { error } = await supabase.from('audit_log').insert({
    business_id: businessId,
    actor,
    action,
    payload_hash: payloadHash,
  });

  if (error) {
    console.error('Error creating audit log:', error);
  }
}
