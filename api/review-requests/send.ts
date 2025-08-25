import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import shortid from 'shortid';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;
const appBaseUrl = process.env.APP_BASE_URL || 'https://finalwebapp-2-fg4gmev3m-xane-shirleys-projects.vercel.app';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, customerId, channel } = req.body;

    if (!businessId || !customerId || !channel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['email', 'sms', 'both'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    // Load customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Load active templates for business
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select('*')
      .eq('business_id', businessId)
      .in('kind', channel === 'both' ? ['email', 'sms'] : [channel]);

    if (templatesError) {
      return res.status(500).json({ error: 'Failed to load templates' });
    }

    // Validate contact info
    if ((channel === 'email' || channel === 'both') && !customer.email) {
      return res.status(400).json({ error: 'Customer has no email address' });
    }

    if ((channel === 'sms' || channel === 'both') && !customer.phone) {
      return res.status(400).json({ error: 'Customer has no phone number' });
    }

    // Generate review link
    const reviewLink = `${appBaseUrl}/feedback/${businessId}?c=${customerId}&t=${shortid.generate()}`;

    // Initialize statuses
    let emailStatus: 'queued' | 'sent' | 'failed' | 'skipped' = 'skipped';
    let smsStatus: 'queued' | 'sent' | 'failed' | 'skipped' = 'skipped';

    // Send email if requested
    if ((channel === 'email' || channel === 'both') && customer.email) {
      const emailTemplate = templates.find(t => t.kind === 'email');
      if (emailTemplate && resendApiKey) {
        try {
          const emailBody = emailTemplate.body
            .replace(/{customer\.name}/g, customer.name)
            .replace(/{company_name}/g, 'Your Company') // TODO: Get from business profile
            .replace(/{review_link}/g, reviewLink);

          const emailSubject = emailTemplate.subject
            ?.replace(/{customer\.name}/g, customer.name)
            .replace(/{company_name}/g, 'Your Company')
            .replace(/{review_link}/g, reviewLink) || 'We\'d love your feedback!';

          // For now, just log the email (we'll implement actual sending later)
          console.log('Would send email:', {
            to: customer.email,
            subject: emailSubject,
            body: emailBody
          });

          emailStatus = 'sent';
        } catch (error) {
          console.error('Email sending failed:', error);
          emailStatus = 'failed';
        }
      } else {
        emailStatus = 'skipped';
      }
    }

    // Send SMS if requested
    if ((channel === 'sms' || channel === 'both') && customer.phone) {
      const smsTemplate = templates.find(t => t.kind === 'sms');
      if (smsTemplate && twilioAccountSid && twilioAuthToken && twilioFrom) {
        try {
          const smsBody = smsTemplate.body
            .replace(/{customer\.name}/g, customer.name)
            .replace(/{company_name}/g, 'Your Company')
            .replace(/{review_link}/g, reviewLink);

          // For now, just log the SMS (we'll implement actual sending later)
          console.log('Would send SMS:', {
            to: customer.phone,
            body: smsBody
          });

          smsStatus = 'sent';
        } catch (error) {
          console.error('SMS sending failed:', error);
          smsStatus = 'failed';
        }
      } else {
        smsStatus = 'skipped';
      }
    }

    // Insert review request record
    const { data: request, error: insertError } = await supabase
      .from('review_requests')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        channel,
        email_status: emailStatus,
        sms_status: smsStatus,
        review_link: reviewLink
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create review request' });
    }

    return res.status(200).json({ 
      ok: true, 
      requestId: request.id,
      emailStatus,
      smsStatus
    });

  } catch (error) {
    console.error('Review request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
