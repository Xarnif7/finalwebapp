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

  // Load templates with proper error handling
  const loadTemplates = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading templates...');
      
      const userEmail = user?.email || 'unknown';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      // Try localStorage first
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        try {
          const savedTemplates = JSON.parse(savedData);
          const templateArray = Object.values(savedTemplates).filter(t => t.user_email === userEmail);
          
          if (templateArray.length > 0) {
            console.log('✅ Loaded templates from localStorage:', templateArray.length);
            // Fix any templates that don't have IDs
            const fixedTemplates = fixTemplateIds(templateArray);
            setTemplates(fixedTemplates);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error);
        }
      }
      
      // Fallback to default templates
      const defaultTemplates = [
        {
          id: generateTemplateId('Job Completed', userEmail),
          name: 'Job Completed',
          description: 'Send thank you email after job completion',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for choosing our services! We hope you\'re satisfied with our work.',
            delay_hours: 24
          },
          user_email: userEmail,
          created_at: new Date().toISOString()
        },
        {
          id: generateTemplateId('Invoice Paid', userEmail),
          name: 'Invoice Paid', 
          description: 'Follow up after invoice payment',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for your payment! We appreciate your business.',
            delay_hours: 2
          },
          user_email: userEmail,
          created_at: new Date().toISOString()
        },
        {
          id: generateTemplateId('Service Reminder', userEmail),
          name: 'Service Reminder',
          description: 'Remind customers about upcoming services',
          status: 'paused', 
          channels: ['email'],
          trigger_type: 'scheduled',
          config_json: {
            message: 'This is a friendly reminder about your upcoming service appointment.',
            delay_hours: 72
          },
          user_email: userEmail,
          created_at: new Date().toISOString()
        }
      ];
      
      console.log('📝 Using default templates');
      setTemplates(defaultTemplates);
      
      // Save defaults to localStorage
      const templateMap = {};
      defaultTemplates.forEach(template => {
        templateMap[template.id] = template;
      });
      localStorage.setItem(localStorageKey, JSON.stringify(templateMap));
      
    } catch (error) {
      console.error('❌ Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save template to localStorage
  const saveTemplateToStorage = (template) => {
    try {
      const userEmail = user?.email || 'unknown';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      const savedData = localStorage.getItem(localStorageKey);
      const savedTemplates = savedData ? JSON.parse(savedData) : {};
      
      savedTemplates[template.id] = {
        ...template,
        user_email: userEmail,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem(localStorageKey, JSON.stringify(savedTemplates));
      console.log('💾 Template saved to localStorage:', template.name);
    } catch (error) {
      console.error('❌ Error saving template:', error);
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
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: newStatus } : t
      ));
      
      // Save to localStorage
      const updatedTemplate = templates.find(t => t.id === templateId);
      if (updatedTemplate) {
        const templateToSave = { ...updatedTemplate, status: newStatus };
        saveTemplateToStorage(templateToSave);
      }
      
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
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === updatedTemplate.id ? updatedTemplate : t
      ));
      
      // Save to localStorage
      saveTemplateToStorage(updatedTemplate);
      
      // Close modal
      setCustomizeModalOpen(false);
      
      console.log('✅ Template saved successfully');
    } catch (error) {
      console.error('❌ Error saving template:', error);
    }
  };

  // Handle create template
  const handleCreateTemplate = async (templateData) => {
    try {
      console.log('➕ Creating new template:', templateData.name);
      
      const userEmail = user?.email || 'unknown';
      const newTemplate = {
        id: generateTemplateId(templateData.name, userEmail),
        name: templateData.name,
        description: templateData.description,
        status: 'paused',
        channels: templateData.channels || ['email'],
        trigger_type: templateData.trigger_type || 'event',
        config_json: {
          message: templateData.message || 'Thank you for your business!',
          delay_hours: templateData.delay_hours ?? 24
        },
        user_email: userEmail,
        created_at: new Date().toISOString()
      };
      
      // Add to local state
      setTemplates(prev => [...prev, newTemplate]);
      
      // Save to localStorage
      saveTemplateToStorage(newTemplate);
      
      // Close modal
      setCreateModalOpen(false);
      
      console.log('✅ Template created successfully');
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
      
      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // Remove from localStorage
      const userEmail = user?.email || 'unknown';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        const savedTemplates = JSON.parse(savedData);
        delete savedTemplates[templateId];
        localStorage.setItem(localStorageKey, JSON.stringify(savedTemplates));
      }
      
      // Close modal if it's open
      setCustomizeModalOpen(false);
      
      console.log('✅ Template deleted successfully');
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
        user={user}
        isCreating={true}
      />
    </div>
  );
};

export default AutomationsPageFixed;