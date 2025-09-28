import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookPayload = req.body;
    const signature = req.headers['intuit-signature'];

    console.log('[QBO] Webhook received:', {
      signature: signature ? 'present' : 'missing',
      payload: webhookPayload,
      timestamp: new Date().toISOString()
    });

    // Verify Intuit HMAC signature
    const webhookVerifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
    
    if (!webhookVerifierToken) {
      console.error('[QBO] Webhook verifier token not configured');
      return res.status(500).json({ error: 'Webhook verification not configured' });
    }

    if (!signature) {
      console.error('[QBO] Missing Intuit signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookVerifierToken)
      .update(JSON.stringify(webhookPayload))
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('[QBO] Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('[QBO] Webhook signature verified successfully');

    // Process webhook events
    const { eventNotifications } = webhookPayload;
    
    if (!eventNotifications || !Array.isArray(eventNotifications)) {
      console.log('[QBO] No event notifications in webhook payload');
      return res.status(200).json({ message: 'No events to process' });
    }

    // Process each event notification
    for (const event of eventNotifications) {
      try {
        await processWebhookEvent(event);
      } catch (eventError) {
        console.error('[QBO] Error processing webhook event:', eventError);
        // Continue processing other events even if one fails
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      eventsProcessed: eventNotifications.length
    });

  } catch (error) {
    console.error('[QBO] Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Process individual webhook event
async function processWebhookEvent(event) {
  const { realmId, dataChangeEvent } = event;
  
  if (!realmId || !dataChangeEvent) {
    console.log('[QBO] Invalid event structure, skipping');
    return;
  }

  console.log(`[QBO] Processing event for realm ${realmId}:`, {
    entities: dataChangeEvent.entities,
    lastUpdated: dataChangeEvent.lastUpdated
  });

  // Find the business_id for this realm
  const { data: integration, error: integrationError } = await supabase
    .from('integrations_quickbooks')
    .select('business_id, connection_status')
    .eq('realm_id', realmId)
    .eq('connection_status', 'connected')
    .single();

  if (integrationError || !integration) {
    console.error(`[QBO] No active integration found for realm ${realmId}`);
    return;
  }

  const businessId = integration.business_id;

  // Update last_webhook_at timestamp
  await supabase
    .from('integrations_quickbooks')
    .update({
      last_webhook_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('realm_id', realmId);

  // Process each entity in the event
  for (const entity of dataChangeEvent.entities) {
    const { name, id, operation } = entity;
    
    console.log(`[QBO] Processing entity: ${name} ${operation} ${id}`);

    try {
      if (name === 'Invoice') {
        await qboHandleInvoice(businessId, realmId, id, operation);
      } else if (name === 'Payment') {
        await qboHandlePayment(businessId, realmId, id, operation);
      } else if (name === 'Customer') {
        // Optional: handle customer updates
        console.log(`[QBO] Customer update detected: ${id}`);
      }
    } catch (entityError) {
      console.error(`[QBO] Error processing ${name} ${id}:`, entityError);
    }
  }
}

// Handle invoice events
async function qboHandleInvoice(businessId, realmId, invoiceId, operation) {
  console.log(`[QBO] Handling invoice ${invoiceId} (${operation}) for business ${businessId}`);

  try {
    // Get integration data for API calls
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_quickbooks')
      .select('access_token, refresh_token')
      .eq('business_id', businessId)
      .eq('realm_id', realmId)
      .eq('connection_status', 'connected')
      .single();

    if (integrationError || !integration) {
      console.error('[QBO] Integration not found for invoice processing');
      return;
    }

    // Fetch invoice details
    const invoiceResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!invoiceResponse.ok) {
      if (invoiceResponse.status === 401) {
        // Try to refresh token and retry
        console.log('[QBO] Token expired, refreshing...');
        await refreshQboToken(businessId, integration);
        const { data: updatedIntegration } = await supabase
          .from('integrations_quickbooks')
          .select('access_token')
          .eq('business_id', businessId)
          .eq('realm_id', realmId)
          .single();
        
        if (updatedIntegration) {
          const retryResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${invoiceId}`, {
            headers: {
              'Authorization': `Bearer ${updatedIntegration.access_token}`,
              'Accept': 'application/json'
            }
          });
          
          if (!retryResponse.ok) {
            throw new Error(`QBO API error: ${retryResponse.status}`);
          }
          
          const invoiceData = await retryResponse.json();
          await processInvoiceData(businessId, realmId, invoiceData.QueryResponse.Invoice[0], operation);
        }
      } else {
        throw new Error(`QBO API error: ${invoiceResponse.status}`);
      }
    } else {
      const invoiceData = await invoiceResponse.json();
      await processInvoiceData(businessId, realmId, invoiceData.QueryResponse.Invoice[0], operation);
    }

  } catch (error) {
    console.error('[QBO] Error handling invoice:', error);
  }
}

// Process invoice data and determine trigger type
async function processInvoiceData(businessId, realmId, invoice, operation) {
  console.log(`[QBO] Processing invoice data:`, {
    id: invoice.Id,
    balance: invoice.Balance,
    totalAmt: invoice.TotalAmt,
    emailStatus: invoice.EmailStatus,
    txnStatus: invoice.TxnStatus,
    customerRef: invoice.CustomerRef?.value
  });

  // Find Blipp customer
  const customerRefValue = invoice.CustomerRef?.value;
  if (!customerRefValue) {
    console.log('[QBO] No customer reference found in invoice');
    return;
  }

  const externalId = `qbo_${customerRefValue}`;
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, full_name, email, external_meta')
    .eq('business_id', businessId)
    .eq('external_source', 'qbo')
    .eq('external_id', externalId)
    .single();

  if (customerError || !customer) {
    console.log(`[QBO] Customer not found for external_id: ${externalId}`);
    return;
  }

  // Determine trigger type
  let triggerType = null;
  
  if (operation === 'Update') {
    // Check if invoice was paid
    if (invoice.Balance === 0 || invoice.TxnStatus === 'Paid') {
      triggerType = 'invoice_paid';
    }
    // Check if invoice was sent via email
    if (invoice.EmailStatus === 'EmailSent') {
      triggerType = 'invoice_sent';
    }
  } else if (operation === 'Create') {
    // New invoice created
    if (invoice.EmailStatus === 'EmailSent') {
      triggerType = 'invoice_sent';
    }
  }

  if (!triggerType) {
    console.log(`[QBO] No trigger type determined for invoice ${invoice.Id}`);
    return;
  }

  console.log(`[QBO] Trigger type determined: ${triggerType}`);

  // Derive job hint from invoice
  const jobHint = deriveJobHint(invoice);
  console.log(`[QBO] Job hint derived: ${jobHint}`);

  // Find matching template
  const templateId = await findMatchingTemplate(businessId, jobHint, triggerType);
  
  if (!templateId) {
    console.log(`[QBO] No matching template found for trigger: ${triggerType}`);
    return;
  }

  console.log(`[QBO] Found matching template: ${templateId}`);

  // Trigger automation
  await triggerAutomation(businessId, customer.id, templateId, {
    trigger_type: triggerType,
    invoice_id: invoice.Id,
    invoice_total: invoice.TotalAmt,
    job_hint: jobHint,
    realm_id: realmId,
    customer_external_id: customerRefValue
  });

  // Record automation event
  await recordAutomationEvent(businessId, customer.id, templateId, triggerType, {
    invoice_id: invoice.Id,
    invoice_total: invoice.TotalAmt,
    job_hint: jobHint,
    webhook_triggered: true
  });
}

// Handle payment events
async function qboHandlePayment(businessId, realmId, paymentId, operation) {
  console.log(`[QBO] Handling payment ${paymentId} (${operation}) for business ${businessId}`);

  try {
    // Get integration data for API calls
    const { data: integration, error: integrationError } = await supabase
      .from('integrations_quickbooks')
      .select('access_token, refresh_token')
      .eq('business_id', businessId)
      .eq('realm_id', realmId)
      .eq('connection_status', 'connected')
      .single();

    if (integrationError || !integration) {
      console.error('[QBO] Integration not found for payment processing');
      return;
    }

    // Fetch payment details
    const paymentResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/payment/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!paymentResponse.ok) {
      if (paymentResponse.status === 401) {
        // Try to refresh token and retry
        console.log('[QBO] Token expired, refreshing...');
        await refreshQboToken(businessId, integration);
        const { data: updatedIntegration } = await supabase
          .from('integrations_quickbooks')
          .select('access_token')
          .eq('business_id', businessId)
          .eq('realm_id', realmId)
          .single();
        
        if (updatedIntegration) {
          const retryResponse = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/payment/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${updatedIntegration.access_token}`,
              'Accept': 'application/json'
            }
          });
          
          if (!retryResponse.ok) {
            throw new Error(`QBO API error: ${retryResponse.status}`);
          }
          
          const paymentData = await retryResponse.json();
          await processPaymentData(businessId, realmId, paymentData.QueryResponse.Payment[0]);
        }
      } else {
        throw new Error(`QBO API error: ${paymentResponse.status}`);
      }
    } else {
      const paymentData = await paymentResponse.json();
      await processPaymentData(businessId, realmId, paymentData.QueryResponse.Payment[0]);
    }

  } catch (error) {
    console.error('[QBO] Error handling payment:', error);
  }
}

// Process payment data and find linked invoice
async function processPaymentData(businessId, realmId, payment) {
  console.log(`[QBO] Processing payment data:`, {
    id: payment.Id,
    totalAmt: payment.TotalAmt,
    linkedTxn: payment.LinkedTxn
  });

  // Find linked invoice transactions
  const linkedInvoices = payment.LinkedTxn?.filter(txn => txn.TxnType === 'Invoice') || [];
  
  for (const linkedTxn of linkedInvoices) {
    console.log(`[QBO] Processing linked invoice: ${linkedTxn.TxnId}`);
    await qboHandleInvoice(businessId, realmId, linkedTxn.TxnId, 'Update');
  }
}

// Derive job hint from invoice
function deriveJobHint(invoice) {
  // Check line items for descriptions or item names
  const lineItems = invoice.Line || [];
  
  for (const line of lineItems) {
    if (line.Description) {
      return line.Description.toLowerCase();
    }
    
    if (line.SalesItemLineDetail?.ItemRef?.name) {
      return line.SalesItemLineDetail.ItemRef.name.toLowerCase();
    }
  }

  // Check custom fields for "Job Type" or "Job ID"
  const customFields = invoice.CustomField || [];
  for (const field of customFields) {
    if (field.DefinitionId === '1' && (field.Name === 'Job Type' || field.Name === 'Job ID')) {
      return field.StringValue?.toLowerCase();
    }
  }

  // Check class reference
  if (invoice.ClassRef?.name) {
    return invoice.ClassRef.name.toLowerCase();
  }

  return null;
}

// Find matching template based on job hint and trigger type
async function findMatchingTemplate(businessId, jobHint, triggerType) {
  console.log(`[QBO] Finding template for business ${businessId}, hint: ${jobHint}, trigger: ${triggerType}`);

  // Get all active templates for this business
  const { data: templates, error: templatesError } = await supabase
    .from('message_templates')
    .select('id, name, content, external_meta')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (templatesError || !templates || templates.length === 0) {
    console.log('[QBO] No active templates found');
    return null;
  }

  // Try exact/substring match against template name and keywords
  if (jobHint) {
    for (const template of templates) {
      const templateName = template.name.toLowerCase();
      const templateKeywords = template.external_meta?.keywords || [];
      
      // Check template name
      if (templateName.includes(jobHint) || jobHint.includes(templateName)) {
        console.log(`[QBO] Found template by name match: ${template.name}`);
        return template.id;
      }
      
      // Check keywords
      for (const keyword of templateKeywords) {
        if (keyword.toLowerCase().includes(jobHint) || jobHint.includes(keyword.toLowerCase())) {
          console.log(`[QBO] Found template by keyword match: ${template.name}`);
          return template.id;
        }
      }
    }
  }

  // Try to find a generic template based on trigger type
  const genericTemplateNames = [
    'Job Completed',
    'Invoice Paid',
    'Payment Received',
    'Service Complete',
    'Work Completed'
  ];

  for (const genericName of genericTemplateNames) {
    const genericTemplate = templates.find(t => 
      t.name.toLowerCase().includes(genericName.toLowerCase())
    );
    
    if (genericTemplate) {
      console.log(`[QBO] Found generic template: ${genericTemplate.name}`);
      return genericTemplate.id;
    }
  }

  // Return the first template as fallback
  if (templates.length > 0) {
    console.log(`[QBO] Using first template as fallback: ${templates[0].name}`);
    return templates[0].id;
  }

  return null;
}

// Trigger automation (placeholder - integrate with existing system)
async function triggerAutomation(businessId, customerId, templateId, metadata) {
  console.log(`[QBO] Triggering automation:`, {
    businessId,
    customerId,
    templateId,
    metadata
  });

  // TODO: Integrate with existing automation system
  // This should call the same function used for manual triggers
  // e.g., automations.queueForCustomer or startSequenceForCustomer
  
  try {
    // For now, create a review request record
    const { error } = await supabase
      .from('review_requests')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        template_id: templateId,
        status: 'pending',
        trigger_type: metadata.trigger_type,
        external_source: 'qbo_webhook',
        external_meta: {
          invoice_id: metadata.invoice_id,
          invoice_total: metadata.invoice_total,
          job_hint: metadata.job_hint,
          realm_id: metadata.realm_id,
          customer_external_id: metadata.customer_external_id,
          triggered_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[QBO] Failed to create review request:', error);
    } else {
      console.log('[QBO] Review request created successfully');
    }
  } catch (error) {
    console.error('[QBO] Error triggering automation:', error);
  }
}

// Record automation event for audit
async function recordAutomationEvent(businessId, customerId, templateId, triggerType, metadata) {
  try {
    const { error } = await supabase
      .from('automation_events')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        template_id: templateId,
        event_type: triggerType,
        trigger_source: 'qbo_webhook',
        status: 'triggered',
        metadata: {
          ...metadata,
          recorded_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[QBO] Failed to record automation event:', error);
    }
  } catch (error) {
    console.error('[QBO] Error recording automation event:', error);
  }
}

// Helper function to refresh QBO token
async function refreshQboToken(businessId, integration) {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  
  const refreshResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token
    })
  });
  
  if (!refreshResponse.ok) {
    throw new Error('Token refresh failed');
  }
  
  const tokenData = await refreshResponse.json();
  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
  
  // Update integration with new tokens
  await supabase
    .from('integrations_quickbooks')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt.toISOString(),
      connection_status: 'connected',
      updated_at: new Date().toISOString()
    })
    .eq('business_id', businessId);
}
