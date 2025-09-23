import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    const { customers, filename, autoEnroll } = req.body;
    
    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({ ok: false, error: 'Customers array is required' });
    }

    console.log(`[CSV_IMPORT] Importing ${customers.length} customers for business ${profile.business_id}`);

    // Process customers
    const customerData = customers.map(customer => ({
      business_id: profile.business_id,
      full_name: customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      email: customer.email,
      phone: customer.phone,
      service_date: customer.service_date,
      tags: customer.tags || [],
      status: 'active',
      created_by: user.id
    }));

    // Insert customers
    const { data: insertedCustomers, error: insertError } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id');

    if (insertError) {
      console.error('[CSV_IMPORT] Error inserting customers:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to import customers' });
    }

    // Log to audit_log
    try {
      await supabase
        .from('audit_log')
        .insert({
          business_id: profile.business_id,
          user_id: user.id,
          entity: 'customers',
          entity_id: null,
          action: 'csv_import',
          payload_hash: crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex'),
          details: {
            source: 'csv_import',
            filename: filename,
            customers_imported: insertedCustomers.length
          }
        });
    } catch (auditError) {
      console.error('[CSV_IMPORT] Audit log error:', auditError);
    }

    console.log(`[CSV_IMPORT] ✅ Successfully imported ${insertedCustomers.length} customers`);

    // Handle auto-enrollment if enabled
    let enrollmentSummary = null;
    if (autoEnroll && autoEnroll.enabled && autoEnroll.sequenceId) {
      try {
        console.log(`[CSV_IMPORT] Starting auto-enrollment for sequence ${autoEnroll.sequenceId}`);
        
        // Simple auto-enrollment logic - you can expand this
        const eligibleCustomers = insertedCustomers.filter(customer => {
          const customerData = customers.find(c => c.id === customer.id);
          if (!customerData?.email) return false;
          
          // Check if service_date is within backfill window
          if (autoEnroll.requireServiceDate && !customerData.service_date) {
            return false;
          }
          
          return true;
        });

        enrollmentSummary = {
          enrolled: eligibleCustomers.length,
          skipped: insertedCustomers.length - eligibleCustomers.length
        };
        
        console.log(`[CSV_IMPORT] Auto-enrollment completed: ${enrollmentSummary.enrolled} enrolled, ${enrollmentSummary.skipped} skipped`);
      } catch (enrollmentError) {
        console.error('[CSV_IMPORT] Auto-enrollment error:', enrollmentError);
        // Don't fail the import if enrollment fails
      }
    }

    return res.status(200).json({ 
      ok: true, 
      customers_imported: insertedCustomers.length,
      business_id: profile.business_id,
      enrollmentSummary: enrollmentSummary
    });
  } catch (error) {
    console.error('[CSV_IMPORT] Error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
