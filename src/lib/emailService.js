// Email service using Resend for automation emails
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendAutomationEmail = async (to, subject, html, from = 'Blipp <noreply@myblipp.com>') => {
  try {
    console.log('[EMAIL] Sending automation email to:', to);
    
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL] Resend error:', error);
      throw new Error(`Email failed: ${error.message}`);
    }

    console.log('[EMAIL] Email sent successfully:', data.id);
    return {
      success: true,
      messageId: data.id,
      email: to
    };

  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Template for automation emails
export const createAutomationEmailTemplate = (customer, template) => {
  const { full_name, email } = customer;
  const { name, config_json } = template;
  
  // Default template if no custom config
  const defaultTemplate = {
    subject: `Thank you for your business, ${full_name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1A73E8;">Thank you for your business!</h2>
        <p>Hi ${full_name},</p>
        <p>We hope you're satisfied with our service! We'd love to hear about your experience.</p>
        <p>Could you take a moment to leave us a review? It really helps our business grow.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://g.page/r/your-review-link" 
             style="background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Leave a Review
          </a>
        </div>
        <p>Thank you for choosing us!</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `
  };

  // Use custom template if available
  const emailConfig = config_json?.email_template || defaultTemplate;
  
  return {
    subject: emailConfig.subject,
    html: emailConfig.html
  };
};
