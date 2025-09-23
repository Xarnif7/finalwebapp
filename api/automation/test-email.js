import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerEmail, customerName, templateId, businessId } = req.body;

  if (!customerEmail || !customerName || !templateId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create a review link for testing
    const reviewLink = `https://myblipp.com/r/test-review-${Date.now()}`;
    
    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError && !templateError.code === 'PGRST116') {
      console.error('Error fetching template:', templateError);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }

    // Default message if no template found
    const message = template?.config_json?.message || 
      `Hi ${customerName},\n\nThank you for your business! We hope you had a great experience with us. If you have a moment, we would appreciate it if you could leave us a review.\n\n${reviewLink}`;

    // Replace variables in message
    const personalizedMessage = message
      .replace(/\{\{customer\.name\}\}/g, customerName)
      .replace(/\{\{review_link\}\}/g, reviewLink);

    // For now, just log the email that would be sent
    // In production, you would integrate with your email service here
    console.log('=== EMAIL TEST ===');
    console.log('To:', customerEmail);
    console.log('Subject: Thank you for your business!');
    console.log('Message:', personalizedMessage);
    console.log('==================');

    // Create automation execution record for tracking
    const { data: execution, error: executionError } = await supabase
      .from('automation_executions')
      .insert({
        template_id: templateId,
        business_id: businessId,
        customer_email: customerEmail,
        status: 'sent',
        scheduled_for: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        review_link: reviewLink
      })
      .select()
      .single();

    if (executionError) {
      console.error('Error creating execution record:', executionError);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully (test mode)',
      executionId: execution?.id,
      reviewLink 
    });

  } catch (error) {
    console.error('Error in test email API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
