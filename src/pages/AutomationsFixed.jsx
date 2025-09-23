import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import FlowCard from '@/components/automation/FlowCard';
import ActiveSequences from '@/components/automation/ActiveSequences';
import TemplateCustomizer from '@/components/automation/TemplateCustomizer';
import { supabase } from '@/lib/supabaseClient';

const AutomationsPageFixed = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [activeSequences, setActiveSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Generate unique template IDs
  const generateTemplateId = (name, userEmail) => {
    const timestamp = Date.now();
    const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
    const sanitizedName = name ? name.replace(/[^a-zA-Z0-9]/g, '_') : 'template';
    return `template_${sanitizedEmail}_${sanitizedName}_${timestamp}`;
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
            setTemplates(templateArray);
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
          delay_hours: templateData.delay_hours || 24
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Automations</h1>
        <p className="text-gray-600">Manage your email automation sequences</p>
      </div>

      {/* Templates Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Templates</h2>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Custom Template
          </button>
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No templates found. Create your first automation template.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <FlowCard
                key={template.id}
                template={template}
                onToggle={(status) => handleTemplateToggle(template.id, status)}
                onCustomize={() => handleCustomize(template)}
                updating={updating[template.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Sequences Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Sequences</h2>
        <ActiveSequences 
          sequences={activeSequences}
          templates={templates}
          onToggle={handleTemplateToggle}
        />
      </div>

      {/* Modals */}
      <TemplateCustomizer
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateSaved}
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