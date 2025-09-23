import { useAuth } from '@/hooks/useAuth';

// Function to trigger an automation for a specific customer
export const triggerAutomation = async (templateId, customerId, triggerData = {}) => {
  try {
    console.log('🚀 Triggering automation:', { templateId, customerId, triggerData });

    // For now, we'll use the existing automation trigger API
    // This will be enhanced to work with our template system
    const response = await fetch('/api/automation/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` // This will need to be updated
      },
      body: JSON.stringify({
        customer_id: customerId,
        trigger_type: 'manual_trigger', // We'll use this for manual triggers
        trigger_data: {
          template_id: templateId,
          source: 'manual',
          timestamp: new Date().toISOString(),
          ...triggerData
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger automation: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Automation triggered successfully:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error triggering automation:', error);
    throw error;
  }
};

// Function to trigger automation with template-specific data
export const triggerTemplateAutomation = async (template, customerId, additionalData = {}) => {
  try {
    console.log('🎯 Triggering template automation:', { 
      templateName: template.name, 
      customerId, 
      templateId: template.id 
    });

    // Create a review request entry that will be processed by the automation system
    const automationData = {
      template_id: template.id,
      customer_id: customerId,
      trigger_type: 'manual_trigger',
      trigger_data: {
        template_name: template.name,
        template_message: template.custom_message || template.config_json?.message,
        delay_hours: template.config_json?.delay_hours || 24,
        channels: template.channels || ['email'],
        source: 'manual_trigger',
        timestamp: new Date().toISOString(),
        ...additionalData
      }
    };

    // Use the automation trigger API directly
    const response = await fetch('/api/automation/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      },
      body: JSON.stringify({
        customer_id: customerId,
        trigger_type: 'manual_trigger',
        trigger_data: {
          template_id: template.id,
          template_name: template.name,
          template_message: template.custom_message || template.config_json?.message,
          delay_hours: template.config_json?.delay_hours || 24,
          channels: template.channels || ['email'],
          source: 'manual_trigger',
          timestamp: new Date().toISOString(),
          ...additionalData
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ API Error Response:', errorData);
      throw new Error(`Failed to trigger template automation: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Template automation triggered successfully:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error triggering template automation:', error);
    throw error;
  }
};
