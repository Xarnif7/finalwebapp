/**
 * Simple test for the email service
 * Run this in browser console to test email functionality
 */

// Test the email service
async function testEmailService() {
  try {
    console.log('Testing email service...');
    
    // Import the email service
    const { sendEmail } = await import('./src/api/emailService.js');
    
    // Test email data
    const testEmailData = {
      to: 'test@example.com',
      subject: 'Test Review Request',
      body: 'Hi John! Thanks for choosing us. We\'d love your feedback: https://example.com/review',
      from: 'noreply@yourbusiness.com'
    };
    
    console.log('Sending test email with data:', testEmailData);
    
    const result = await sendEmail(testEmailData);
    
    console.log('Email service result:', result);
    
    if (result.ok) {
      console.log('✅ Email service test passed!');
    } else {
      console.log('❌ Email service test failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Email service test error:', error);
    return { ok: false, error: error.message };
  }
}

// Export for use in browser console
window.testEmailService = testEmailService;

console.log('Email service test loaded. Run testEmailService() to test.');
