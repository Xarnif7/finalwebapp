import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Journey Executor - Processes sequence enrollments and sends per-step messages
 * Runs as a cron job to execute scheduled journey steps
 */

// Helper function to resolve variables in message templates
function resolveVariables(template, variables) {
  if (!template) return '';
  
  let resolved = template;
  
  // Replace all {{variable.path}} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Handle nested objects like customer.name, business.phone
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        const pattern = new RegExp(`{{\\s*${key}\\.${nestedKey}\\s*}}`, 'g');
        resolved = resolved.replace(pattern, nestedValue || '');
      });
    } else {
      // Handle simple replacements
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      resolved = resolved.replace(pattern, value || '');
    }
  });
  
  return resolved;
}

// Helper function to send email using Resend
async function sendEmail({ to, subject, body, businessName }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${businessName || 'Blipp'} <noreply@myblipp.com>`,
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="white-space: pre-line; line-height: 1.6;">
            ${body}
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Sent via Blipp | <a href="https://myblipp.com" style="color: #999;">myblipp.com</a>
          </p>
        </div>
      `,
      text: body
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send email');
  }

  return await response.json();
}

// Helper function to send SMS using Twilio
async function sendSMS({ to, body }) {
  const response = await fetch(`${process.env.APP_BASE_URL || 'https://myblipp.com'}/api/sms-send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: to,
      body: body + '\n\nReply STOP to opt out.'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to send SMS');
  }

  return await response.json();
}

export default async function handler(req, res) {
  try {
    console.log('🚀 [JOURNEY_EXECUTOR] Starting journey execution cycle...');
    
    // Validate request method
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const currentTime = new Date();
    const currentTimeISO = currentTime.toISOString();
    
    // Query sequence enrollments that are ready to execute
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('sequence_enrollments')
      .select(`
        id,
        sequence_id,
        customer_id,
        business_id,
        current_step_index,
        next_run_at,
        meta,
        sequences!inner(name, status),
        customers!inner(id, full_name, email, phone),
        businesses!inner(name, phone, google_review_url)
      `)
      .eq('status', 'active')
      .lte('next_run_at', currentTimeISO)
      .limit(50);

    if (enrollmentsError) {
      console.error('[JOURNEY_EXECUTOR] Error fetching enrollments:', enrollmentsError);
      return res.status(500).json({ error: 'Failed to fetch enrollments' });
    }

    let processedCount = 0;
    let sentCount = 0;
    let errorCount = 0;

    for (const enrollment of enrollments || []) {
      try {
        console.log(`[JOURNEY_EXECUTOR] Processing enrollment ${enrollment.id}, step ${enrollment.current_step_index}`);

        // Get the current step to execute
        const { data: step, error: stepError } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_index', enrollment.current_step_index)
          .single();

        if (stepError || !step) {
          console.error(`[JOURNEY_EXECUTOR] No step found for enrollment ${enrollment.id} at index ${enrollment.current_step_index}`);
          
          // Mark enrollment as finished (reached end of sequence)
          await supabase
            .from('sequence_enrollments')
            .update({ 
              status: 'finished',
              updated_at: currentTimeISO
            })
            .eq('id', enrollment.id);
          
          processedCount++;
          continue;
        }

        // Execute based on step kind
        if (step.kind === 'send_email') {
          // Send email step
          const customer = enrollment.customers;
          const business = enrollment.businesses;
          const messageConfig = step.message_config || {};

          // Generate review link if needed
          const reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/feedback-form/${business.id}?customer=${customer.id}`;
          const bookingLink = business.google_review_url || reviewLink; // Fallback to review link

          // Prepare variables for template resolution
          const variables = {
            customer: {
              name: customer.full_name,
              email: customer.email,
              phone: customer.phone
            },
            business: {
              name: business.name,
              phone: business.phone
            },
            review_link: reviewLink,
            booking_link: bookingLink,
            offer_link: messageConfig.offer_link || bookingLink
          };

          // Resolve subject and body with variables
          const subject = resolveVariables(messageConfig.subject || 'Message from {{business.name}}', variables);
          const body = resolveVariables(messageConfig.body || 'Thank you for your business!', variables);

          // Send email
          if (customer.email) {
            try {
              await sendEmail({
                to: customer.email,
                subject: subject,
                body: body,
                businessName: business.name
              });

              sentCount++;
              console.log(`✅ [JOURNEY_EXECUTOR] Sent email to ${customer.email}`);
            } catch (emailError) {
              console.error(`❌ [JOURNEY_EXECUTOR] Email send failed:`, emailError);
              errorCount++;
            }
          }
        } else if (step.kind === 'send_sms') {
          // Send SMS step
          const customer = enrollment.customers;
          const business = enrollment.businesses;
          const messageConfig = step.message_config || {};

          // Generate review link if needed
          const reviewLink = `${process.env.APP_BASE_URL || 'https://myblipp.com'}/feedback-form/${business.id}?customer=${customer.id}`;
          const bookingLink = business.google_review_url || reviewLink;

          // Prepare variables for template resolution
          const variables = {
            customer: {
              name: customer.full_name,
              email: customer.email,
              phone: customer.phone
            },
            business: {
              name: business.name,
              phone: business.phone
            },
            review_link: reviewLink,
            booking_link: bookingLink,
            offer_link: messageConfig.offer_link || bookingLink
          };

          // Resolve body with variables
          const body = resolveVariables(messageConfig.body || 'Thank you for your business!', variables);

          // Send SMS
          if (customer.phone) {
            try {
              await sendSMS({
                to: customer.phone,
                body: body
              });

              sentCount++;
              console.log(`✅ [JOURNEY_EXECUTOR] Sent SMS to ${customer.phone}`);
            } catch (smsError) {
              console.error(`❌ [JOURNEY_EXECUTOR] SMS send failed:`, smsError);
              errorCount++;
            }
          }
        } else if (step.kind === 'wait') {
          // Wait step - just log and continue
          console.log(`⏰ [JOURNEY_EXECUTOR] Wait step encountered, advancing...`);
        }

        // Move to next step
        const { data: nextSteps } = await supabase
          .from('sequence_steps')
          .select('step_index, wait_ms')
          .eq('sequence_id', enrollment.sequence_id)
          .gt('step_index', enrollment.current_step_index)
          .order('step_index', { ascending: true })
          .limit(1);

        if (nextSteps && nextSteps.length > 0) {
          const nextStep = nextSteps[0];
          const nextRunAt = new Date(currentTime.getTime() + (nextStep.wait_ms || 0));

          // Update enrollment to next step
          await supabase
            .from('sequence_enrollments')
            .update({
              current_step_index: nextStep.step_index,
              next_run_at: nextRunAt.toISOString(),
              last_event_at: currentTimeISO,
              updated_at: currentTimeISO
            })
            .eq('id', enrollment.id);

          console.log(`➡️ [JOURNEY_EXECUTOR] Advanced to step ${nextStep.step_index}, next run: ${nextRunAt.toISOString()}`);
        } else {
          // No more steps - mark as finished
          await supabase
            .from('sequence_enrollments')
            .update({
              status: 'finished',
              last_event_at: currentTimeISO,
              updated_at: currentTimeISO
            })
            .eq('id', enrollment.id);

          console.log(`🏁 [JOURNEY_EXECUTOR] Journey completed for enrollment ${enrollment.id}`);
        }

        processedCount++;

      } catch (error) {
        console.error(`❌ [JOURNEY_EXECUTOR] Error processing enrollment ${enrollment.id}:`, error);
        errorCount++;
        
        // Update enrollment with error metadata
        await supabase
          .from('sequence_enrollments')
          .update({
            meta: {
              ...enrollment.meta,
              last_error: error.message,
              last_error_at: currentTimeISO
            },
            updated_at: currentTimeISO
          })
          .eq('id', enrollment.id);
      }
    }

    console.log(`✅ [JOURNEY_EXECUTOR] Execution cycle complete:`, {
      processed: processedCount,
      sent: sentCount,
      errors: errorCount
    });

    return res.status(200).json({
      success: true,
      processed: processedCount,
      sent: sentCount,
      errors: errorCount,
      message: `Processed ${processedCount} enrollments, sent ${sentCount} messages`
    });

  } catch (error) {
    console.error('❌ [JOURNEY_EXECUTOR] Fatal error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

