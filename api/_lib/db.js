/**
 * Database Helper
 * Supabase client and common database operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (server-side only)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[DB] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get business by ID
 */
async function getBusiness(businessId) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update business fields
 */
async function updateBusiness(businessId, updates) {
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Upsert message by surge_message_id (idempotent)
 */
async function upsertMessage(messageData) {
  const { data, error} = await supabase
    .from('messages')
    .upsert(
      messageData,
      { 
        onConflict: 'surge_message_id',
        ignoreDuplicates: false 
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert new message
 */
async function insertMessage(messageData) {
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update message status by surge_message_id
 */
async function updateMessageStatus(surgeMessageId, status, error = null) {
  const updates = { status };
  if (error) updates.error = error;

  const { data, error: updateError } = await supabase
    .from('messages')
    .update(updates)
    .eq('surge_message_id', surgeMessageId)
    .select()
    .single();

  if (updateError) throw updateError;
  return data;
}

/**
 * Upsert contact by (business_id, phone_e164)
 */
async function upsertContact(contactData) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      contactData,
      { 
        onConflict: 'business_id,phone_e164',
        ignoreDuplicates: false 
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get contact by business_id and phone
 */
async function getContact(businessId, phoneE164) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone_e164', phoneE164)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Mark contact as opted out
 */
async function setContactOptedOut(businessId, phoneE164, optedOut = true) {
  const { data, error } = await supabase
    .from('contacts')
    .update({ opted_out: optedOut })
    .eq('business_id', businessId)
    .eq('phone_e164', phoneE164)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get business by from_number (for inbound messages)
 */
async function getBusinessByFromNumber(fromNumber) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('from_number', fromNumber)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

module.exports = {
  supabase,
  getBusiness,
  updateBusiness,
  upsertMessage,
  insertMessage,
  updateMessageStatus,
  upsertContact,
  getContact,
  setContactOptedOut,
  getBusinessByFromNumber
};
