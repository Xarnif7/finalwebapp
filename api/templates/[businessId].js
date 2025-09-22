import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { businessId } = req.query;
  const method = req.method;

  if (method === 'GET') {
    return handleGet(req, res, businessId);
  } else if (method === 'POST') {
    return handlePost(req, res, businessId);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res, businessId) {
  try {
    // Get user from JWT token
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get automation templates (sequences)
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    return res.status(200).json({ 
      success: true, 
      templates: templates || []
    });

  } catch (error) {
    console.error('Error in GET templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req, res, businessId) {
  try {
    const { name, description, channels, trigger_type, config_json } = req.body;

    // Validate required fields
    if (!name || !channels || !Array.isArray(channels)) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, channels' 
      });
    }

    // Get user from JWT token
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('created_by', user.email)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Generate a unique key for the template
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    // Create the template
    const { data: template, error: insertError } = await supabase
      .from('automation_templates')
      .insert({
        business_id: businessId,
        key: key,
        name: name,
        status: 'ready',
        channels: channels,
        trigger_type: trigger_type || 'event',
        config_json: config_json || {
          message: description || 'Thank you for your business! We would appreciate a review.',
          delay_hours: 24
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating template:', insertError);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    // Log the creation
    await supabase.rpc('log_telemetry_event', {
      p_business_id: businessId,
      p_event_type: 'sequence_created',
      p_event_data: { 
        template_id: template.id,
        name: name,
        channels: channels,
        trigger_type: trigger_type
      }
    });

    return res.status(201).json({ 
      success: true, 
      template: template,
      message: 'Sequence created successfully'
    });

  } catch (error) {
    console.error('Error in POST templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}