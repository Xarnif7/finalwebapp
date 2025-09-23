import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    console.log('Starting automation execution...');
    
    // Execute scheduled automations
    const { data: processedCount, error: executeError } = await supabase
      .rpc('execute_scheduled_automations');

    if (executeError) {
      console.error('Error executing automations:', executeError);
      return res.status(500).json({ error: 'Failed to execute automations' });
    }

    console.log(`Processed ${processedCount} automation executions`);

    // Get pending scheduled automation emails
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
      .lte('run_at', new Date().toISOString())
      .limit(20);

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
              console.log('🔑 RESEND_API_KEY length:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0);
              
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
                  from: request.businesses.email || 'noreply@myblipp.com',
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
              console.log('📧 Email response headers:', Object.fromEntries(emailResponse.headers.entries()));
              
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
    const { data: pendingRequests, error: requestsError } = await supabase
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
    
    for (const request of pendingRequests || []) {
      try {
        // Skip SMS for now (as requested)
        if (request.channel === 'sms') {
          continue;
        }

        // Send email
        if (request.channel === 'email' && request.customers.email) {
          const emailData = {
            to: request.customers.email,
            from: request.businesses.email || 'noreply@myblipp.com',
            subject: 'Thank you for your business!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Thank you for your business!</h2>
                <p>Hi ${request.customers.full_name || 'Customer'},</p>
                <p>${request.message}</p>
                <p><a href="${request.review_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
                <p>Best regards,<br>${request.businesses.name}</p>
              </div>
            `
          };

          // Call the send-now API internally
          const sendResponse = await fetch(`${process.env.APP_BASE_URL}/api/review-requests/send-now`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              review_request_id: request.id,
              channel: 'email'
            })
          });

          if (sendResponse.ok) {
            sentCount++;
            console.log(`Sent email to ${request.customers.email}`);
            
            // Mark review request as sent
            await supabase
              .from('review_requests')
              .update({ 
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', request.id);
          } else {
            console.error(`Failed to send email to ${request.customers.email}`);
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

    console.log(`Sent ${sentCount} emails`);

    return res.status(200).json({ 
      success: true, 
      processed_automations: processedCount,
      sent_emails: sentCount,
      message: `Processed ${processedCount} automations and sent ${sentCount} emails`
    });

  } catch (error) {
    console.error('Error in automation executor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
