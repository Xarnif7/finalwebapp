import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FlowCard from '@/components/automation/FlowCard';
import ActiveSequences from '@/components/automation/ActiveSequences';
import TemplateCustomizer from '@/components/automation/TemplateCustomizer';
import { supabase } from '@/lib/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AutomationsPageFixed = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [activeSequences, setActiveSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Get current tab from URL or default to 'templates'
  const currentTab = searchParams.get('tab') || 'templates';
  
  // Handle tab change
  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  // Generate unique template IDs
  const generateTemplateId = (name, userEmail) => {
    const timestamp = Date.now();
    const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
    const sanitizedName = name ? name.replace(/[^a-zA-Z0-9]/g, '_') : 'template';
    return `template_${sanitizedEmail}_${sanitizedName}_${timestamp}`;
  };

  // Fix templates that don't have IDs
  const fixTemplateIds = (templates) => {
    const userEmail = user?.email || 'unknown';
    return templates.map(template => {
      if (!template.id) {
        console.log('🔧 Fixing template without ID:', template.name);
        return {
          ...template,
          id: generateTemplateId(template.name, userEmail)
        };
      }
      return template;
    });
  };

  // Load templates from database
  const loadTemplates = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading templates from database...');
      
      // Get business ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.business_id) {
        console.error('❌ No business ID found');
        setTemplates([]);
        setLoading(false);
        return;
      }
      
      // Fetch templates from database
      const { data: dbTemplates, error: fetchError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('❌ Error fetching templates from database:', fetchError);
        setTemplates([]);
        setLoading(false);
        return;
      }
      
      if (dbTemplates && dbTemplates.length > 0) {
        console.log('✅ Loaded templates from database:', dbTemplates.length);
        setTemplates(dbTemplates);
      } else {
        console.log('ℹ️ No templates found in database - new business starts with empty templates');
        setTemplates([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      setTemplates([]);
      setLoading(false);
    }
  };


  // Handle template toggle
  const handleTemplateToggle = async (templateId, newStatus) => {
    if (!templateId) {
      console.error('❌ Cannot toggle: templateId is null');
      return;
    }
    
    console.log('🔄 Toggling template:', templateId, 'to', newStatus);
    setUpdating(prev => ({ ...prev, [templateId]: true }));
    
    try {
      // Get business ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.business_id) {
        console.error('❌ No business ID found');
        return;
      }
      
      // Update in database
      const { error: updateError } = await supabase
        .from('automation_templates')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('business_id', profile.business_id);
      
      if (updateError) {
        console.error('❌ Error updating template status in database:', updateError);
        return;
      }
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: newStatus } : t
      ));
      
      // Load active sequences
      await loadActiveSequences();
      
      console.log('✅ Template toggled successfully');
    } catch (error) {
      console.error('❌ Error toggling template:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [templateId]: false }));
    }
  };

  // Load active sequences
  const loadActiveSequences = async () => {
    try {
      const activeTemplates = templates.filter(t => t.status === 'active');
      setActiveSequences(activeTemplates);
      console.log('📊 Active sequences loaded:', activeTemplates.length);
    } catch (error) {
      console.error('❌ Error loading active sequences:', error);
    }
  };

  // Handle template customization
  const handleCustomize = (template) => {
    if (!template || !template.id) {
      console.error('❌ Cannot customize: invalid template');
      return;
    }
    console.log('🔧 Customizing template:', template.name);
    setSelectedTemplate(template);
    setCustomizeModalOpen(true);
  };

  // Handle template save
  const handleTemplateSaved = async (updatedTemplate) => {
    try {
      console.log('💾 Saving template:', updatedTemplate.name);
      
      // Get business ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.business_id) {
        console.error('❌ No business ID found');
        return;
      }
      
      // Update template in database
      const { error: updateError } = await supabase
        .from('automation_templates')
        .update({
          name: updatedTemplate.name,
          status: updatedTemplate.status,
          channels: updatedTemplate.channels,
          trigger_type: updatedTemplate.trigger_type,
          config_json: updatedTemplate.config_json,
          description: updatedTemplate.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedTemplate.id)
        .eq('business_id', profile.business_id);
      
      if (updateError) {
        console.error('❌ Error updating template in database:', updateError);
        return;
      }
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
      
      // Close modal
      setCustomizeModalOpen(false);
      
      console.log('✅ Template saved successfully to database');
    } catch (error) {
      console.error('❌ Error saving template:', error);
    }
  };

  // Handle create template
  const handleCreateTemplate = async (templateData) => {
    try {
      console.log('➕ Creating new template:', templateData.name);
      
      // Get business ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.business_id) {
        console.error('❌ No business ID found');
        return;
      }
      
      // Generate unique key for custom template
      const customKey = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Normalize visual defaults
      const displayName = (templateData.name || '').trim();
      const titleCaseName = displayName
        .toLowerCase()
        .split(/\s+/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      // Create template in database
      const { data: newTemplate, error: createError } = await supabase
        .from('automation_templates')
        .insert({
          business_id: profile.business_id,
          key: customKey, // Use unique custom key
          name: titleCaseName || 'Custom Template',
          status: templateData.status || 'active',
          channels: templateData.channels && templateData.channels.length ? templateData.channels : ['email'],
          trigger_type: templateData.trigger_type || 'event',
          config_json: {
            message: (templateData.message || 'Thank you for your business! Please consider leaving us a review.'),
            delay_hours: (templateData.delay_hours ?? 24),
            keywords: templateData.keywords || []
          },
          description: templateData.description || `Sends email ${templateData.delay_hours ?? 24} hours after ${titleCaseName}.`
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating template in database:', createError);
        return;
      }
      
      // Add to local state
      setTemplates(prev => [...prev, newTemplate]);
      
      // Close modal
      setCreateModalOpen(false);
      
      console.log('✅ Template created successfully in database');
    } catch (error) {
      console.error('❌ Error creating template:', error);
    }
  };

  // Handle delete template - supports both template ID and template object
  const handleDeleteTemplate = async (templateIdOrTemplate) => {
    let templateId = templateIdOrTemplate;
    let templateName = 'Unknown';
    
    // If we received a template object instead of just an ID
    if (typeof templateIdOrTemplate === 'object' && templateIdOrTemplate !== null) {
      templateId = templateIdOrTemplate.id;
      templateName = templateIdOrTemplate.name || 'Unknown';
    }
    
    if (!templateId) {
      console.error('❌ Cannot delete: templateId is null or undefined');
      
      // Try to delete by name/index as fallback
      const shouldForceDelete = confirm(`Error: Template "${templateName}" is missing an ID. Would you like to force delete it anyway? This will remove it from the list but may not clean up all data.`);
      
      if (shouldForceDelete) {
        try {
          console.log('🗑️ Force deleting template without ID:', templateName);
          
          // Remove from local state by name
          setTemplates(prev => prev.filter(t => t.name !== templateName));
          
          // Close modal if it's open
          setCustomizeModalOpen(false);
          
          console.log('✅ Template force deleted successfully');
          return;
        } catch (error) {
          console.error('❌ Error force deleting template:', error);
          alert('Error force deleting template. Please refresh the page and try again.');
          return;
        }
      }
      
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log('🗑️ Deleting template:', templateId, templateName);
      
      // Get business ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.business_id) {
        console.error('❌ No business ID found');
        return;
      }
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('automation_templates')
        .delete()
        .eq('id', templateId)
        .eq('business_id', profile.business_id);
      
      if (deleteError) {
        console.error('❌ Error deleting template from database:', deleteError);
        alert('Error deleting template from database. Please try again.');
        return;
      }
      
      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // Close modal if it's open
      setCustomizeModalOpen(false);
      
      console.log('✅ Template deleted successfully from database');
    } catch (error) {
      console.error('❌ Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user?.email) {
      loadTemplates();
    }
  }, [user?.email]);

  // Update active sequences when templates change
  useEffect(() => {
    loadActiveSequences();
  }, [templates]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Automations</h1>
        <p className="text-gray-600">Manage your email automation sequences</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="active">Active Sequences</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold">Automation Templates</h2>
            <button
              onClick={() => {
                if (templates.length >= 9) {
                  alert('Maximum of 9 templates allowed. Please edit or delete existing templates to create new ones.');
                  return;
                }
                setCreateModalOpen(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Custom Template ({templates.length}/9)
            </button>
          </div>
          
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-500 mb-4">Create your first automation template to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <FlowCard
                  key={template.id || template.name || Math.random()}
                  template={template}
                  onToggle={(status) => handleTemplateToggle(template.id, status)}
                  onCustomize={() => handleCustomize(template)}
                  onDelete={() => handleDeleteTemplate(template)}
                  updating={updating[template.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Sequences Tab */}
        <TabsContent value="active" className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Active Sequences</h2>
          <ActiveSequences 
            sequences={activeSequences}
            templates={templates}
            onToggle={handleTemplateToggle}
          />
        </TabsContent>

      </Tabs>

      {/* Modals */}
      <TemplateCustomizer
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateSaved}
        onDelete={selectedTemplate?.id ? () => handleDeleteTemplate(selectedTemplate.id) : null}
        businessId={business?.id}
        user={user}
      />

      <TemplateCustomizer
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        template={{
          id: null,
          name: '',
          description: '',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for your business!',
            delay_hours: 24
          }
        }}
        onSave={handleCreateTemplate}
        businessId={business?.id}
        user={user}
        isCreating={true}
      />
    </div>
  );
};

export default AutomationsPageFixed;