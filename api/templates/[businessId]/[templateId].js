import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { businessId, templateId } = req.query;
  const method = req.method;

  if (method === 'GET') {
    return handleGet(req, res, businessId, templateId);
  } else if (method === 'PATCH') {
    return handlePatch(req, res, businessId, templateId);
  } else if (method === 'DELETE') {
    return handleDelete(req, res, businessId, templateId);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res, businessId, templateId) {
  try {
    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select(`
        *,
        businesses!inner(id, created_by)
      `)
      .eq('id', templateId)
      .eq('business_id', businessId)
      .eq('businesses.created_by', user.email)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json({ 
      success: true, 
      template: template
    });

  } catch (error) {
    console.error('Error in GET template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePatch(req, res, businessId, templateId) {
  try {
    const updateData = req.body;

    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify template ownership
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select(`
        id,
        businesses!inner(id, created_by)
      `)
      .eq('id', templateId)
      .eq('business_id', businessId)
      .eq('businesses.created_by', user.email)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update the template with enhanced data structure
    console.log('🔧 Template update data received:', {
      custom_message: updateData.custom_message,
      config_json_message: updateData.config_json?.message,
      has_custom_message: updateData.custom_message !== undefined
    });
    
    // Only update safe fields to avoid constraint violations
    const updatePayload = {
      updated_at: new Date().toISOString()
    };
    
    // Only include fields that exist in the schema and are safe to update
    if (updateData.name !== undefined) updatePayload.name = updateData.name;
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    if (updateData.status !== undefined) updatePayload.status = updateData.status;
    if (updateData.channels !== undefined) updatePayload.channels = updateData.channels;
    if (updateData.trigger_type !== undefined) updatePayload.trigger_type = updateData.trigger_type;
    if (updateData.config_json !== undefined) updatePayload.config_json = updateData.config_json;
    if (updateData.service_types !== undefined) updatePayload.service_types = updateData.service_types;
    if (updateData.is_default !== undefined) updatePayload.is_default = updateData.is_default;
    if (updateData.trigger_events !== undefined) updatePayload.trigger_events = updateData.trigger_events;

    // Handle custom message updates - prioritize custom_message over config_json.message
    if (updateData.custom_message !== undefined) {
      updatePayload.custom_message = updateData.custom_message;
      console.log('✅ Setting custom_message from updateData.custom_message:', updateData.custom_message);
    } else if (updateData.config_json && updateData.config_json.message) {
      updatePayload.custom_message = updateData.config_json.message;
      console.log('✅ Setting custom_message from config_json.message:', updateData.config_json.message);
    }
    
    console.log('🔧 Final updatePayload.custom_message:', updatePayload.custom_message);

    // Handle AI generation tracking
    if (updateData.ai_generated !== undefined) {
      updatePayload.ai_generated = updateData.ai_generated;
      if (updateData.ai_generated) {
        updatePayload.last_ai_generation = new Date().toISOString();
      }
    }

    // Handle message variables
    if (updateData.message_variables) {
      updatePayload.message_variables = updateData.message_variables;
    }

    // Handle preview data
    if (updateData.preview_data) {
      updatePayload.preview_data = updateData.preview_data;
    }

    // If config_json is being updated, ensure it has the right structure
    if (updateData.config_json && updateData.config_json.steps) {
      // Calculate delay_hours from the first non-zero delay step
      const delayStep = updateData.config_json.steps.find(step => step.delay > 0);
      if (delayStep) {
        let delayHours = delayStep.delay;
        if (delayStep.delayUnit === 'days') {
          delayHours = delayStep.delay * 24;
        } else if (delayStep.delayUnit === 'minutes') {
          delayHours = delayStep.delay / 60;
        }
        updatePayload.config_json.delay_hours = delayHours;
      }
    }

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('automation_templates')
      .update(updatePayload)
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating template:', updateError);
      console.error('❌ Update payload:', JSON.stringify(updatePayload, null, 2));
      console.error('❌ Template ID:', templateId);
      console.error('❌ Business ID:', businessId);
      return res.status(500).json({ error: 'Failed to update template', details: updateError.message });
    }

    // Log the update
    await supabase.rpc('log_telemetry_event', {
      p_business_id: businessId,
      p_event_type: 'sequence_updated',
      p_event_data: { 
        template_id: templateId,
        updates: updateData
      }
    });

    return res.status(200).json({ 
      success: true, 
      template: updatedTemplate,
      message: 'Sequence updated successfully'
    });

  } catch (error) {
    console.error('Error in PATCH template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req, res, businessId, templateId) {
  try {
    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify template ownership
    const { data: template, error: templateError } = await supabase
      .from('automation_templates')
      .select(`
        id,
        businesses!inner(id, created_by)
      `)
      .eq('id', templateId)
      .eq('business_id', businessId)
      .eq('businesses.created_by', user.email)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete the template
    const { error: deleteError } = await supabase
      .from('automation_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    // Log the deletion
    await supabase.rpc('log_telemetry_event', {
      p_business_id: businessId,
      p_event_type: 'sequence_deleted',
      p_event_data: { 
        template_id: templateId
      }
    });

    return res.status(200).json({ 
      success: true,
      message: 'Sequence deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
