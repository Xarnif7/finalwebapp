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

    return res.status(200).json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('Error in template status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
