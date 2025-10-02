import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, customerId, templateId, message, channel = 'email', to } = req.body;

    if (!businessId || !customerId || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name, email')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('id', templateId)
      .eq('business_id', businessId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Use provided message or template message
    const finalMessage = message || template.config_json?.message || 'Thank you for your business!';

    // Personalize message
    const personalizedMessage = finalMessage
      .replace(/\{\{customer\.name\}\}/g, customer.full_name || 'Customer')
      .replace(/\{\{business\.name\}\}/g, business.name)
      .replace(/\{\{review_link\}\}/g, `https://www.google.com/search?q=${encodeURIComponent(business.name)}`);

    let result = { success: true, message: 'Message sent successfully' };

    if (channel === 'email' && (customer.email || to)) {
      // Send email via Resend
      const recipientEmail = to || customer.email;
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: business.email || 'noreply@myblipp.com',
          to: [recipientEmail],
          subject: 'Thank you for your business!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for your business!</h2>
              <p>Hi ${customer.full_name || 'Customer'},</p>
              <p>${personalizedMessage}</p>
              <p><a href="https://www.google.com/search?q=${encodeURIComponent(business.name)}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
              <p>Best regards,<br>${business.name}</p>
            </div>
          `,
          text: `Hi ${customer.full_name || 'Customer'},\n\n${personalizedMessage}\n\nhttps://www.google.com/search?q=${encodeURIComponent(business.name)}\n\nBest regards,\n${business.name}`
        })
      });

      const emailData = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(`Email failed: ${emailData.message || 'Unknown error'}`);
      }

      result.emailId = emailData.id;
      result.channel = 'email';

    } else if (channel === 'sms' && (customer.phone || to)) {
      // Send SMS via Surge API
      const recipientPhone = to || customer.phone;
      const smsResponse = await fetch(`${process.env.APP_BASE_URL}/api/surge/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          businessId: businessId,
          to: recipientPhone,
          body: personalizedMessage
        })
      });

      const smsData = await smsResponse.json();

      if (!smsResponse.ok) {
        throw new Error(`SMS failed: ${smsData.error || 'Unknown error'}`);
      }

      result.messageId = smsData.message_id;
      result.channel = 'sms';

    } else {
      return res.status(400).json({ error: 'Invalid channel or missing contact info' });
    }

    // Log the immediate send
    await supabase
      .from('automation_logs')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        sequence_id: null,
        level: 'info',
        source: 'immediate_send',
        message: `Immediate ${channel} sent via template ${templateId}`,
        data: {
          template_id: templateId,
          channel: channel,
          message: personalizedMessage
        }
      });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in test send:', error);
    return res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}
