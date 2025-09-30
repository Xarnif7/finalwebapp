import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { to, subject, message, customerName } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Blipp <noreply@myblipp.com>',
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Thank You for Your Feedback</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear ${customerName || 'Valued Customer'},
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Best regards,<br>
              The Blipp Team
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      emailId: data.id 
    });

  } catch (error) {
    console.error('Error sending follow-up email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
