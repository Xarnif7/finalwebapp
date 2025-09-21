import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if templates already exist for this business
    const { data: existingTemplates } = await supabase
      .from('automation_templates')
      .select('id')
      .eq('business_id', business_id);

    if (existingTemplates && existingTemplates.length > 0) {
      return res.status(200).json({
        success: true,
        templates: existingTemplates,
        message: 'Templates already exist'
      });
    }

    // Create default templates
    const defaultTemplates = [
      {
        business_id: business_id,
        key: 'job_completed',
        name: 'Job Completed',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.",
          delay_hours: 24
        },
        rate_per_hour: 50,
        rate_per_day: 500
      },
      {
        business_id: business_id,
        key: 'invoice_paid',
        name: 'Invoice Paid',
        status: 'ready',
        channels: ['email', 'sms'],
        trigger_type: 'event',
        config_json: {
          message: "Thank you for your payment! We appreciate your business. Please consider leaving us a review.",
          delay_hours: 48
        },
        rate_per_hour: 50,
        rate_per_day: 500
      },
      {
        business_id: business_id,
        key: 'service_reminder',
        name: 'Service Reminder',
        status: 'ready',
        channels: ['sms', 'email'],
        trigger_type: 'date_based',
        config_json: {
          message: "This is a friendly reminder about your upcoming service appointment. We look forward to serving you!",
          delay_days: 1
        },
        rate_per_hour: 50,
        rate_per_day: 500
      }
    ];

    const { data: templates, error } = await supabase
      .from('automation_templates')
      .insert(defaultTemplates)
      .select();

    if (error) {
      console.error('Error creating default templates:', error);
      return res.status(500).json({ error: 'Failed to create default templates' });
    }

    return res.status(200).json({
      success: true,
      templates: templates
    });

  } catch (error) {
    console.error('Error in provision defaults API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
