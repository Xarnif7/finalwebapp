import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).send(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  // Check authentication - support both Zapier and Blipp 1.0 formats
  const zapierTokenHeader = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  const zapierTokenQuery = req.query.zapier_token;
  const blippBusiness = req.headers['x-blipp-business'] || req.headers['X-Blipp-Business'];
  const authBearer = req.headers['authorization'];
  const blippSignature = req.headers['x-blipp-signature'] || req.headers['X-Blipp-Signature'];
  
  // Accept either Zapier token (header or query) or Blipp 1.0 authentication
  const zapierToken = zapierTokenHeader || zapierTokenQuery;
  const isZapierAuth = zapierToken && zapierToken === process.env.ZAPIER_TOKEN;
  const isBlippAuth = blippBusiness && (authBearer || blippSignature);
  
  if (!isZapierAuth && !isBlippAuth) {
    res.setHeader('Content-Type', 'application/json');
    res.status(401).send(JSON.stringify({ 
      ok: false, 
      error: "unauthorized - missing valid authentication",
      debug: {
        has_zapier_header: !!zapierTokenHeader,
        has_zapier_query: !!zapierTokenQuery,
        has_blipp_business: !!blippBusiness,
        has_auth_bearer: !!authBearer,
        has_blipp_signature: !!blippSignature
      }
    }));
    return;
  }

  // Parse JSON body
  let data;
  try {
    data = req.body;
    if (!data) {
      res.setHeader('Content-Type', 'application/json');
      res.status(400).send(JSON.stringify({ ok: false, error: "No JSON body provided" }));
      return;
    }
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ ok: false, error: `Invalid JSON: ${e.message}` }));
    return;
  }

  // Validate required fields
  const { 
    external_id, 
    email, 
    phone, 
    first_name, 
    last_name, 
    tags,
    source,
    event_ts,
    business_id
  } = data;

  // At least one of email or phone must be present
  if (!email && !phone) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).send(JSON.stringify({ ok: false, error: 'email_or_phone_required' }));
    return;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve business_id from payload, headers, or fallback
    let resolvedBusinessId;
    
    if (business_id) {
      resolvedBusinessId = business_id;
    } else if (blippBusiness) {
      resolvedBusinessId = blippBusiness;
    } else {
      // Fallback: use Demo Business
      let { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('name', 'Demo Business')
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error('Error fetching Demo Business:', businessError);
        throw new Error('Failed to fetch business');
      }

      if (!business) {
        // Create Demo Business
        const { data: newBusiness, error: insertError } = await supabase
          .from('businesses')
          .insert({ 
            name: 'Demo Business',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating Demo Business:', insertError);
          throw new Error('Failed to create business');
        }
        business = newBusiness;
      }
      resolvedBusinessId = business.id;
    }

    // Log the payload and headers for debugging
    console.log('[zapier:upsert-customer]', {
      external_id,
      email,
      phone,
      first_name,
      last_name,
      business_id: resolvedBusinessId,
      auth_type: isZapierAuth ? 'zapier' : 'blipp_1_0',
      auth_method: {
        zapier_header: !!zapierTokenHeader,
        zapier_query: !!zapierTokenQuery,
        blipp_business: blippBusiness,
        auth_bearer: !!authBearer,
        blipp_signature: !!blippSignature
      }
    });

    // Prepare customer data - handle empty strings properly
    const customerData = {
      business_id: resolvedBusinessId,
      full_name: `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown Customer',
      email: email && email.trim() ? email.trim() : null,
      phone: phone && phone.trim() ? phone.trim() : null,
      external_id: external_id && external_id.trim() ? external_id.trim() : null,
      source: source || 'blipp_1_0',
      tags: Array.isArray(tags) ? tags : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert customer (insert or update)
    const { data: customer, error: upsertError } = await supabase
      .from('customers')
      .upsert(customerData, {
        onConflict: 'business_id,email',
        ignoreDuplicates: false
      })
      .select('id, full_name, email, phone')
      .single();

    if (upsertError) {
      console.error('[zapier:upsert-customer] Upsert error:', {
        error: upsertError,
        customerData: customerData,
        business_id: resolvedBusinessId
      });
      res.setHeader('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({ 
        ok: false, 
        error: 'Failed to upsert customer',
        details: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint
      }));
      return;
    }

    // Check if this is the first customer for this business and provision default templates
    try {
      const { data: existingTemplates, error: templatesError } = await supabase
        .from('automation_templates')
        .select('id')
        .eq('business_id', resolvedBusinessId)
        .limit(1);

      if (!templatesError && (!existingTemplates || existingTemplates.length === 0)) {
        console.log(`[zapier:upsert-customer] No templates found, provisioning defaults for business: ${resolvedBusinessId}`);
        
        const defaultTemplates = [
          {
            business_id: resolvedBusinessId,
            key: 'job_completed',
            name: 'Job Completed',
            status: 'ready',
            channels: ['sms', 'email'],
            trigger_type: 'event',
            config_json: {
              message: "Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.",
              delay_hours: 24
            }
          },
          {
            business_id: resolvedBusinessId,
            key: 'invoice_paid',
            name: 'Invoice Paid',
            status: 'ready',
            channels: ['email', 'sms'],
            trigger_type: 'event',
            config_json: {
              message: "Thank you for your payment! We appreciate your business. Please consider leaving us a review.",
              delay_hours: 48
            }
          },
          {
            business_id: resolvedBusinessId,
            key: 'service_reminder',
            name: 'Service Reminder',
            status: 'ready',
            channels: ['sms', 'email'],
            trigger_type: 'date_based',
            config_json: {
              message: "This is a friendly reminder about your upcoming service appointment. We look forward to serving you!",
              delay_days: 1
            }
          }
        ];

        const { data: newTemplates, error: insertError } = await supabase
          .from('automation_templates')
          .insert(defaultTemplates)
          .select();

        if (insertError) {
          console.error('[zapier:upsert-customer] Error creating default templates:', insertError);
        } else {
          console.log(`[zapier:upsert-customer] Created ${newTemplates.length} default templates for business: ${resolvedBusinessId}`);
        }
      }
    } catch (templateError) {
      console.error('[zapier:upsert-customer] Error checking/creating templates:', templateError);
    }

    // Return success response
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      customer_id: customer.id,
      customer: {
        id: customer.id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone
      },
      business_id: resolvedBusinessId,
      message: 'Customer upserted successfully'
    }));

  } catch (error) {
    console.error('[zapier:upsert-customer] Unexpected error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).send(JSON.stringify({ 
      ok: false, 
      error: 'Internal server error',
      details: error.message 
    }));
  }
}
