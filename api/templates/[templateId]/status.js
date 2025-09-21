import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { templateId } = req.query;
    const { status } = req.body;

    if (!templateId || !status) {
      return res.status(400).json({ error: 'Template ID and status are required' });
    }

    if (!['ready', 'active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ready, active, or paused' });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the template first to get business_id
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError) {
      console.error('Error fetching template:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }

    // Update template status
    const { data: template, error } = await supabase
      .from('automation_templates')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template status:', error);
      return res.status(500).json({ error: 'Failed to update template status' });
    }

    // If enabling template (status = 'active'), create an active sequence
    if (status === 'active') {
      try {
        const sequenceData = {
          business_id: existingTemplate.business_id,
          template_id: templateId,
          name: `${existingTemplate.name} Sequence`,
          key: existingTemplate.key,
          status: 'active',
          trigger_type: existingTemplate.trigger_type,
          channels: existingTemplate.channels,
          config_json: existingTemplate.config_json,
          rate_per_hour: existingTemplate.rate_per_hour,
          rate_per_day: existingTemplate.rate_per_day
        };

        const { data: sequence, error: sequenceError } = await supabase
          .from('automation_sequences')
          .insert(sequenceData)
          .select()
          .single();

        if (sequenceError) {
          console.error('Error creating active sequence:', sequenceError);
          // Don't fail the request, just log the error
        } else {
          console.log('Created active sequence:', sequence.id);
        }
      } catch (sequenceError) {
        console.error('Error creating sequence:', sequenceError);
        // Don't fail the request, just log the error
      }
    }

    return res.status(200).json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('Error in template status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
