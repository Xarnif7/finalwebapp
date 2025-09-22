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

    // Get pending review requests and send them
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
      .or('email_status.eq.pending,sms_status.eq.pending')
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
            email_status: 'failed',
            sms_status: 'failed'
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
