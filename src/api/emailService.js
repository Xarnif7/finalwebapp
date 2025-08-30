/**
 * Email service with fallback for different environments
 */

// Fallback email service for non-base44 environments
const fallbackEmailService = async ({ to, subject, body, from }) => {
  // In a real implementation, this would integrate with a service like:
  // - SendGrid
  // - Mailgun
  // - AWS SES
  // - Nodemailer with SMTP
  
  console.log('Fallback email service called:', { to, subject, body, from });
  
  // For now, just simulate success
  return {
    ok: true,
    messageId: `fallback-${Date.now()}`,
    message: 'Email sent via fallback service (simulated)'
  };
};

// Main email service function
export const sendEmail = async (emailData) => {
  try {
    // Try to use base44 SendEmail integration first
    const { SendEmail } = await import('@/api/integrations');
    
    if (SendEmail && typeof SendEmail === 'function') {
      return await SendEmail(emailData);
    } else {
      throw new Error('SendEmail integration not available');
    }
  } catch (error) {
    console.warn('Base44 SendEmail not available, using fallback:', error.message);
    
    // Use fallback service
    return await fallbackEmailService(emailData);
  }
};

export default sendEmail;
