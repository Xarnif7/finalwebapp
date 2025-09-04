/**
 * Resend Email Service Integration
 * Handles sending emails via Resend API
 */

const RESEND_API_KEY = process.env.VITE_RESEND_API_KEY;

export const sendEmailViaResend = async ({ to, subject, body, from }) => {
  try {
    if (!RESEND_API_KEY) {
      throw new Error('Resend API key not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'noreply@yourdomain.com',
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
        text: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      ok: true,
      messageId: data.id,
      message: 'Email sent successfully via Resend',
      data: data
    };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      ok: false,
      error: error.message,
      message: `Failed to send email: ${error.message}`
    };
  }
};

export default sendEmailViaResend;
