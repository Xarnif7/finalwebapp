import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AI Timing Optimization Function
async function calculateAITiming(businessId, channel, customerId = null) {
  try {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL.replace('supabase.co', 'myblipp.com')}/api/ai-timing/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        channel,
        customerId,
        triggerType: 'review_request'
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return {
          delay: result.optimalTiming.delay,
          unit: result.optimalTiming.unit,
          confidence: result.optimalTiming.confidence
        };
      }
    }
  } catch (error) {
    console.error('[AI_TIMING] Error in automation executor:', error);
  }
  
  // Fallback timing
  return {
    delay: channel === 'email' ? 3 : 2,
    unit: 'hours',
    confidence: 75
  };
}

export default async function handler(req, res) {
  try {
    console.log('🔄 Automation executor cron job triggered');
    
    // Validate request method
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get pending scheduled automation emails
    const currentTime = new Date().toISOString();
    
    const { data: scheduledJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select(`
        id,
        job_type,
        payload,
        run_at,
        business_id
      `)
      .eq('job_type', 'automation_email')
      .eq('status', 'queued')
      .lte('run_at', currentTime)
      .limit(20);

    if (jobsError) {
      console.error('Error fetching scheduled automation emails:', jobsError);
      return res.status(500).json({ error: 'Failed to fetch scheduled jobs' });
    }

    let processedAutomations = 0;
    
    if (scheduledJobs && scheduledJobs.length > 0) {
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
              console.log('📧 Sending email to:', request.customers.email);
              
              if (!process.env.RESEND_API_KEY) {
                console.error('❌ RESEND_API_KEY is not available in environment');
                await supabase
                  .from('scheduled_jobs')
                  .update({ status: 'failed', error_message: 'RESEND_API_KEY not configured' })
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
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333;">Thank you for your business!</h2>
                      <p>Hi ${request.customers.full_name || 'Customer'},</p>
                      <p>${request.message}</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${request.review_link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Leave a Review</a>
                      </div>
                      <p>Best regards,<br>${request.businesses.name}</p>
                    </div>
                  `,
                  text: `Hi ${request.customers.full_name || 'Customer'},\n\n${request.message}\n\n${request.review_link}\n\nBest regards,\n${request.businesses.name}`
                })
              });

              const emailData = await emailResponse.json();
              
              if (emailResponse.ok) {
                console.log(`✅ Automation email sent to ${request.customers.email}`);
                processedAutomations++;
                
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
                
                // Mark job as failed
                await supabase
                  .from('scheduled_jobs')
                  .update({ 
                    status: 'failed', 
                    error_message: emailData.message || 'Email send failed'
                  })
                  .eq('id', job.id);
              }
            } catch (emailError) {
              console.error(`❌ Error sending automation email to ${request.customers.email}:`, emailError);
              
              // Mark job as failed
              await supabase
                .from('scheduled_jobs')
                .update({ 
                  status: 'failed', 
                  error_message: emailError.message || 'Email send error'
                })
                .eq('id', job.id);
            }
          } else {
            console.error(`No customer email for review request ${reviewRequestId}`);
            await supabase
              .from('scheduled_jobs')
              .update({ 
                status: 'failed', 
                error_message: 'No customer email address'
              })
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
        // Send SMS if channel is SMS
        if (request.channel === 'sms' && request.customers.phone) {
          try {
            const smsResponse = await fetch(`${process.env.APP_BASE_URL || 'https://myblipp.com'}/api/sms-send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: request.customers.phone,
                body: request.message + '\n\nReply STOP to opt out. Reply HELP for help.'
              })
            });

            if (smsResponse.ok) {
              sentCount++;
              console.log(`✅ SMS sent to ${request.customers.phone}`);
            } else {
              console.error(`❌ SMS failed for ${request.customers.phone}:`, await smsResponse.text());
            }
          } catch (smsError) {
            console.error(`❌ SMS error for ${request.customers.phone}:`, smsError);
          }
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

    console.log(`✅ Automation executor completed. Processed ${processedAutomations} automations and sent ${sentCount} emails`);

    return res.status(200).json({ 
      success: true, 
      processedAutomations: processedAutomations,
      processedRequests: sentCount,
      message: `Processed ${processedAutomations} automations and sent ${sentCount} emails`
    });

  } catch (error) {
    console.error('❌ Error in automation executor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
