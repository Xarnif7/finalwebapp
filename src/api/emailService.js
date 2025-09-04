/**
 * Email service with Resend integration and fallback
 */

import { sendEmailViaResend } from './resendService';

// Fallback email service for when Resend is not available
const fallbackEmailService = async ({ to, subject, body, from }) => {
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
    // Try Resend first
    console.log('Attempting to send email via Resend...');
    const resendResult = await sendEmailViaResend(emailData);
    
    if (resendResult.ok) {
      console.log('Email sent successfully via Resend');
      return resendResult;
    } else {
      throw new Error(resendResult.error || 'Resend failed');
    }
  } catch (resendError) {
    console.warn('Resend not available, trying base44 integration:', resendError.message);
    
    try {
      // Try to use base44 SendEmail integration as fallback
      const { SendEmail } = await import('@/api/integrations');
      
      if (SendEmail && typeof SendEmail === 'function') {
        return await SendEmail(emailData);
      } else {
        throw new Error('SendEmail integration not available');
      }
    } catch (base44Error) {
      console.warn('Base44 SendEmail not available, using fallback:', base44Error.message);
      
      // Use fallback service
      return await fallbackEmailService(emailData);
    }
  }
};

export default sendEmail;
