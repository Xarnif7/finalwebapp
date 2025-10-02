import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // Preemptively refresh QBO tokens that expire in <15 minutes
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: expiring } = await supabase
      .from('integrations_quickbooks')
      .select('*')
      .lt('token_expires_at', soon);
    if (expiring && expiring.length) {
      for (const row of expiring) {
        try {
          if (!row.refresh_token) continue;
          const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
          const resp = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }).toString()
          });
          if (resp.ok) {
            const tok = await resp.json();
            const expiresAt = new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString();
            await supabase
              .from('integrations_quickbooks')
              .update({ access_token: tok.access_token, refresh_token: tok.refresh_token || row.refresh_token, token_expires_at: expiresAt, connection_status: 'connected', updated_at: new Date().toISOString() })
              .eq('id', row.id);
          }
        } catch {}
      }
    }
    console.log('🔄 Automation executor cron job triggered');
    console.log('🔍 DEBUG: Method:', req.method);
    console.log('🔍 DEBUG: URL:', req.url);
    console.log('🔍 DEBUG: Headers:', req.headers);

    // Get pending scheduled automation emails
    console.log('🔍 DEBUG: Fetching automation_email jobs...');
    const currentTime = new Date().toISOString();
    console.log('🔍 DEBUG: Current time:', currentTime);
    
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select(`
        id,
        job_type,
        payload,
        run_at
      `)
      .eq('job_type', 'automation_email')
      .eq('status', 'queued')
      .lte('run_at', currentTime)
      .limit(20);

    console.log('🔍 DEBUG: Query result - error:', jobsError);
    console.log('🔍 DEBUG: Query result - jobs found:', scheduledJobs ? scheduledJobs.length : 0);
    if (scheduledJobs && scheduledJobs.length > 0) {
      console.log('🔍 DEBUG: First job details:', scheduledJobs[0]);
    }

    if (jobsError) {
      console.error('Error fetching scheduled automation emails:', jobsError);
    } else if (scheduledJobs && scheduledJobs.length > 0) {
      console.log(`Processing ${scheduledJobs.length} scheduled automation emails`);
      
      for (const job of scheduledJobs) {
        try {
          const reviewRequestId = job.payload.review_request_id;
          
          if (!reviewRequestId) {
            console.error(`No review_request_id in job ${job.id}`);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
            continue;
          }

          // Fetch the review request data
          const { data: request, error: requestError } = await supabase
            .from('review_requests')
            .select(`
              id,
              business_id,
              channel,
              message,
              review_link,
              customers!inner(full_name, email, phone),
              businesses!inner(name, email)
            `)
            .eq('id', reviewRequestId)
            .single();

          if (requestError || !request) {
            console.error(`Error fetching review request ${reviewRequestId}:`, requestError);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
            continue;
          }

          // Check if the review request has already been sent
          if (request.status === 'sent' && request.sent_at) {
            console.log(`✅ Review request ${reviewRequestId} already sent, marking job as success`);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'success', processed_at: new Date().toISOString() })
              .eq('id', job.id);
            continue;
          }
          
          // Send the automation email
          if (request.customers.email) {
            try {
              // Send email directly via Resend API
              console.log('📧 Sending email to:', request.customers.email);
              console.log('🔑 RESEND_API_KEY available:', !!process.env.RESEND_API_KEY);
              
              if (!process.env.RESEND_API_KEY) {
                console.error('❌ RESEND_API_KEY is not available in environment');
                await supabase
                  .from('scheduled_jobs')
                  .update({ status: 'failed' })
                  .eq('id', job.id);
                continue;
              }
              
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `${request.businesses?.name || 'Blipp'} <noreply@myblipp.com>`,
                  to: [request.customers.email],
                  subject: 'Thank you for your business!',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2>Thank you for your business!</h2>
                      <p>Hi ${request.customers.full_name || 'Customer'},</p>
                      <p>${request.message}</p>
                      <p><a href="${request.review_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
                      <p>Best regards,<br>${request.businesses.name}</p>
                    </div>
                  `,
                  text: `Hi ${request.customers.full_name || 'Customer'},\n\n${request.message}\n\n${request.review_link}\n\nBest regards,\n${request.businesses.name}`
                })
              });

              const emailData = await emailResponse.json();

              console.log('📧 Email response status:', emailResponse.status);
              console.log('📧 Email response data:', emailData);
              
              if (emailResponse.ok) {
                console.log(`✅ Automation email sent to ${request.customers.email} via Resend`);
                console.log(`📧 Email ID: ${emailData.id}`);
                
                // Mark job as success
                await supabase
                  .from('scheduled_jobs')
                  .update({ status: 'success', processed_at: new Date().toISOString() })
                  .eq('id', job.id);
                
                // Mark review request as sent
                await supabase
                  .from('review_requests')
                  .update({ 
                    status: 'sent',
                    sent_at: new Date().toISOString()
                  })
                  .eq('id', reviewRequestId);
                
              } else {
                console.error(`❌ Failed to send automation email to ${request.customers.email}:`, emailData);
                console.error(`❌ Response status: ${emailResponse.status}`);
                
                // Mark job as failed
                await supabase
                  .from('scheduled_jobs')
                  .update({ status: 'failed' })
                  .eq('id', job.id);
              }
            } catch (emailError) {
              console.error(`❌ Error sending automation email to ${request.customers.email}:`, emailError);
              
              // Mark job as failed
              await supabase
                .from('scheduled_jobs')
                .update({ status: 'failed' })
                .eq('id', job.id);
            }
          } else {
            console.error(`No customer email for review request ${reviewRequestId}`);
            await supabase
              .from('scheduled_jobs')
              .update({ status: 'failed' })
              .eq('id', job.id);
          }
        } catch (error) {
          console.error(`Error processing automation job ${job.id}:`, error);
          
          // Mark job as failed
          await supabase
            .from('scheduled_jobs')
            .update({ status: 'failed' })
            .eq('id', job.id);
        }
      }
    }

    // Get pending review requests and send them (existing functionality)
    const { data: allPendingRequests, error: requestsError } = await supabase
      .from('review_requests')
      .select(`
        id, 
        business_id, 
        channel, 
        message, 
        review_link,
        customers!inner(full_name, email, phone),
        businesses!inner(name, email)
      `)
      .eq('status', 'pending')
      .limit(20);

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      return res.status(500).json({ error: 'Failed to fetch pending requests' });
    }

    let sentCount = 0;
    
    for (const request of allPendingRequests || []) {
      try {
        // Skip SMS for now (as requested)
        if (request.channel === 'sms') {
          continue;
        }

        // Send email
        if (request.channel === 'email' && request.customers.email) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${request.businesses?.name || 'Blipp'} <noreply@myblipp.com>`,
              to: [request.customers.email],
              subject: 'Thank you for your business!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Thank you for your business!</h2>
                  <p>Hi ${request.customers.full_name || 'Customer'},</p>
                  <p>${request.message}</p>
                  <p><a href="${request.review_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
                  <p>Best regards,<br>${request.businesses.name}</p>
                </div>
              `,
              text: `Hi ${request.customers.full_name || 'Customer'},\n\n${request.message}\n\n${request.review_link}\n\nBest regards,\n${request.businesses.name}`
            })
          });

          if (emailResponse.ok) {
            sentCount++;
            console.log(`✅ Sent email to ${request.customers.email}`);
            
            // Mark review request as sent
            await supabase
              .from('review_requests')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', request.id);
          } else {
            console.error(`❌ Failed to send email to ${request.customers.email}`);
          }
        }
      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('review_requests')
          .update({ 
            status: 'failed'
          })
          .eq('id', request.id);
      }
    }

    console.log(`✅ Automation executor completed. Sent ${sentCount} emails`);

    return res.status(200).json({ 
      success: true, 
      sent_emails: sentCount,
      message: `Sent ${sentCount} emails`
    });

  } catch (error) {
    console.error('❌ Error in automation executor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
