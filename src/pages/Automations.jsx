import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare, ArrowRight, Plus, Trash2, GripVertical, Zap, List, FileText, AlertTriangle, RefreshCw, Star } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";
import AutomationWizard from "@/components/automations/AutomationWizard";
import JourneyTemplatesModal from "@/components/automations/JourneyTemplatesModal";
import ActiveSequences from "@/components/automation/ActiveSequences";
import TestSendModal from "@/components/automation/TestSendModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const AutomationsPage = () => {
  console.log('🚨🚨🚨 AUTOMATIONS COMPONENT STARTING 🚨🚨🚨');
  const { user } = useAuth();
  const { business } = useBusiness();
  console.log('🚨🚨🚨 AUTOMATIONS HOOKS LOADED 🚨🚨🚨', { user: user?.email, business: business?.id });
  const [templates, setTemplates] = useState([]);
  const [activeSequences, setActiveSequences] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState("Subject: Thank you for your business!\n\nHi {{customer.name}},\n\nWe hope you had a great experience with us. If you have a moment, we would appreciate it if you could leave us a review at the link below.\n\n{{review_link}}\n\nThank you!");
  const [showEmailSaved, setShowEmailSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [testSendModalOpen, setTestSendModalOpen] = useState(false);
  const [automationWizardOpen, setAutomationWizardOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');

  // Load data on component mount
  useEffect(() => {
    if (user?.email && business?.id) {
        loadTemplates();
        loadActiveSequences();
    } else if (user?.email) {
      // User logged in but no business yet - show default templates
      loadDefaultTemplates();
    } else {
      setLoading(false);
    }
  }, [user?.email, business?.id]);

  // Update active sequences when templates change
  useEffect(() => {
    loadActiveSequences();
  }, [templates]);


  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      if (!business?.id) {
        console.log('No business ID available, cannot load templates');
        setLoading(false);
        return;
      }
      
      // Load ALL sequences (journeys) from the sequences API
      const response = await fetch('/api/sequences', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const sequences = data.sequences || [];
        
        console.log('📋 Loaded sequences for Automations tab:', sequences.length);
        
        // Convert sequences to template format for compatibility
        const templates = sequences.map(sequence => ({
          id: sequence.id,
          name: sequence.name,
          description: sequence.description || `Journey triggered by ${sequence.trigger_event_type}`,
          status: sequence.status,
          channels: sequence.channels || ['email', 'sms'],
          trigger_type: sequence.trigger_type || 'event',
          key: sequence.trigger_event_type,
          config_json: {
            trigger_event_type: sequence.trigger_event_type,
            allow_manual_enroll: sequence.allow_manual_enroll,
            quiet_hours_start: sequence.quiet_hours_start,
            quiet_hours_end: sequence.quiet_hours_end,
            steps: sequence.step_summary || []
          },
          created_at: sequence.created_at,
          updated_at: sequence.updated_at,
          business_id: sequence.business_id
        }));
        
        setTemplates(templates);
      } else {
        console.error('Failed to load sequences:', response.statusText);
        loadDefaultTemplates();
      }
    } catch (error) {
      console.error('Error loading sequences:', error);
      loadDefaultTemplates();
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplates = () => {
    const defaultTemplates = [
      {
        id: 'default-job-completed',
          name: 'Job Completed',
          key: 'job_completed',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
          message: 'Thank you for choosing our services! We hope you had a great experience. Please consider leaving us a review.',
            delay_hours: 24
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        business_id: business?.id
        },
        {
        id: 'default-invoice-paid',
          name: 'Invoice Paid',
          key: 'invoice_paid',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
            delay_hours: 48
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        business_id: business?.id
        },
        {
        id: 'default-service-reminder',
          name: 'Service Reminder',
          key: 'service_reminder',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'date_based',
          config_json: {
            message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
            delay_days: 1
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        business_id: business?.id
        }
    ];
    
    setTemplates(defaultTemplates);
      setLoading(false);
  };

  const provisionDefaultTemplates = async (businessId = business?.id) => {
    try {
      if (!businessId) {
        console.error('No business ID available for provisioning templates');
        return;
      }
      
      const response = await fetch('/api/templates/provision-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          business_id: businessId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        console.log('Default templates provisioned successfully');
      }
    } catch (error) {
      console.error('Error provisioning default templates:', error);
    }
  };

  const loadActiveSequences = async () => {
    try {
      console.log('🔄 Loading active sequences from API...');
      
      if (!business?.id) {
        console.log('No business ID available, cannot load sequences');
        setActiveSequences([]);
        return;
      }

      const response = await fetch('/api/sequences', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 API sequences response:', data);
        
        // Extract sequences from API response
        const allSequences = data.sequences || [];
        
        // Filter for active sequences only
        const activeSequences = allSequences.filter(seq => seq.status === 'active');
        setActiveSequences(activeSequences);
        console.log('✅ Active sequences loaded:', activeSequences.length);
      } else {
        console.error('Failed to load sequences:', response.statusText);
        setActiveSequences([]);
      }
    } catch (error) {
      console.error('Error loading active sequences:', error);
      setActiveSequences([]);
    }
  };

  const getTemplateDescription = (template) => {
    const descriptions = {
      'job_completed': 'Sends thank you email 24 hours after job completion',
      'invoice_paid': 'Sends review request 48 hours after invoice payment',
      'service_reminder': 'Sends reminder 1 day before scheduled service',
      'mock-1': 'Sends thank you email 24 hours after job completion',
      'mock-2': 'Sends review request 48 hours after invoice payment', 
      'mock-3': 'Sends reminder 1 day before scheduled service'
    };
    
    return descriptions[template.key] || descriptions[template.id] || `Custom automation for ${template.name}`;
  };


  const saveEmailTemplate = async () => {
    try {
      setShowEmailSaved(true);
      setTimeout(() => setShowEmailSaved(false), 2000);
      
      // Save to templates table
      const response = await fetch(`/api/templates/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          name: 'Email Template',
          description: emailTemplate,
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: emailTemplate,
            delay_hours: 24
          }
        })
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error saving email template:', error);
    }
  };

  const handleTemplateToggle = async (templateId, newStatus) => {
    if (!templateId) {
      console.error('❌ Cannot toggle template: templateId is null');
      return;
    }
    
    setUpdating(prev => ({ ...prev, [templateId]: true }));
    
    try {
      // Update local state immediately for better UX
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: newStatus } : t
      ));
      
      // Update active sequences state as well
      setActiveSequences(prev => prev.map(s => 
        s.id === templateId ? { ...s, status: newStatus } : s
      ));

      // Use the new toggle endpoint for all sequences
      const response = await fetch(`/api/sequences/${templateId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        // Revert local state if API call failed
        setTemplates(prev => prev.map(t => 
          t.id === templateId ? { ...t, status: t.status === 'active' ? 'paused' : 'active' } : t
        ));
        setActiveSequences(prev => prev.map(s => 
          s.id === templateId ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
        ));
        console.error('Failed to update sequence status');
        toast({
          title: "Error",
          description: "Failed to update sequence status",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Sequence ${newStatus === 'active' ? 'activated' : 'paused'} successfully`,
          variant: "default"
        });
      }
      
      // Reload active sequences
      await loadActiveSequences();
        
    } catch (error) {
      console.error('Error updating template:', error);
      // Revert local state on error
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: t.status === 'active' ? 'paused' : 'active' } : t
      ));
      setActiveSequences(prev => prev.map(s => 
        s.id === templateId ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
      ));
      toast({
        title: "Error",
        description: "Failed to update sequence status",
        variant: "destructive"
      });
    } finally {
      setUpdating(prev => ({ ...prev, [templateId]: false }));
    }
  };


  const handleCustomize = (template) => {
    if (!template || !template.id) {
      console.error('❌ Cannot customize template: template or template.id is null');
      return;
    }
    
    console.log('🔧 Customizing template in wizard:', template.name, 'with ID:', template.id);
    // Set selected template so AutomationWizard can pre-fill the form
    setSelectedTemplate(template);
    // Open AutomationWizard with this template
    setAutomationWizardOpen(true);
  };

  const handleTemplateSaved = async (updatedTemplate) => {
    console.log('Template saved:', updatedTemplate);
    
    // Reload both templates and active sequences to get fresh data
    await loadTemplates();
    await loadActiveSequences();
  };


  const handleTest = async (template) => {
    try {
      // For testing, use the user's email as the test customer
      const testEmail = user?.email || 'test@example.com';
      const testName = user?.user_metadata?.full_name || 'Test Customer';

      const response = await fetch('/api/automation/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          template_id: template.id,
          business_id: business?.id,
          customer_email: testEmail,
          customer_name: testName
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Test email sent successfully:', result);
        alert(`Test email sent to ${testEmail}! Check your inbox in a few minutes.`);
      } else {
        console.error('Failed to send test email:', response.statusText);
        alert('Failed to send test email. Check console for details.');
      }
    } catch (error) {
      console.error('Error triggering test automation:', error);
      alert('Error testing automation');
    }
  };

  const handleTestSend = (template) => {
    console.log('🧪 Test Send clicked with template:', template);
    setSelectedTemplate(template);
    setTestSendModalOpen(true);
    console.log('🧪 Modal should be opening now...');
  };

  const handleManualTrigger = async (sequence) => {
    try {
      console.log('🎯 Manual trigger for sequence:', sequence.id);
      
      // Create a test customer enrollment
      const testCustomer = {
        email: user?.email || 'test@example.com',
        name: user?.user_metadata?.full_name || 'Test Customer',
        phone: '+1234567890'
      };

      const response = await fetch('/api/sequences/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          sequence_id: sequence.id,
          customer: testCustomer,
          trigger_type: 'manual'
        })
      });

      if (response.ok) {
        toast({
          title: "Sequence Triggered",
          description: `Test sequence started - check your ${testCustomer.email.includes('@') ? 'email' : 'phone'} for messages`,
        });
      } else {
        throw new Error('Failed to trigger sequence');
      }
    } catch (error) {
      console.error('Error triggering sequence:', error);
      toast({
        title: "Error",
        description: "Failed to trigger sequence",
        variant: "destructive"
      });
    }
  };

  // Debug: Log the function to make sure it exists
  console.log('🧪 handleTestSend function defined:', typeof handleTestSend);


  const handleDelete = async (template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        const response = await fetch(`/api/templates/${business.id}/${template.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });

        if (response.ok) {
          await loadTemplates();
        }
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };



  const handleCreateTemplate = async (templateData) => {
    try {
      console.log('🎯 Creating new template:', templateData);
      
      // Create template locally first for immediate feedback
      const newTemplate = {
        id: `custom-${Date.now()}`,
        name: templateData.name,
        description: templateData.description,
        channels: templateData.channels || ['email'],
        trigger_type: templateData.trigger_type || 'event',
        config_json: templateData.config_json || {
          message: 'Thank you for your business! We would appreciate a review.',
          delay_hours: 24
        },
        status: 'paused',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        business_id: business?.id
      };
      
      // Add to local templates immediately
      setTemplates(prev => [...prev, newTemplate]);
      
      // Try to save to database if we have a business ID
      if (business?.id && user?.access_token) {
        try {
          const response = await fetch(`/api/templates/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          name: templateData.name,
          description: templateData.description,
          channels: templateData.channels,
          trigger_type: templateData.trigger_type,
          config_json: templateData.config_json
        })
      });

      if (response.ok) {
            const apiTemplate = await response.json();
            console.log('✅ Template saved to database:', apiTemplate);
            
            // Update local template with database ID
            setTemplates(prev => prev.map(t => 
              t.id === newTemplate.id ? { ...t, id: apiTemplate.template.id } : t
            ));
      } else {
            console.warn('Failed to save template to database, keeping local copy');
          }
        } catch (apiError) {
          console.warn('API error saving template, keeping local copy:', apiError);
        }
      }
        
        // Close modal
        setCreateModalOpen(false);
        
        // Show success message
      alert(`Template "${newTemplate.name}" created successfully!`);
      
    } catch (error) {
      console.error('❌ Error creating template:', error);
      alert('Error creating template. Please try again.');
    }
  };


  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Automations"
        subtitle="Create and manage automation sequences with beautiful visual flow cards and full customization."
      />

      {/* Main Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Main navigation">
          {[
            { id: 'templates', label: 'Automations', icon: FileText },
            { id: 'active', label: 'Active Sequences', icon: Play }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header with Create Options */}
          <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Automations</h2>
              <p className="text-sm text-gray-600">Create and manage your automation sequences - from simple to complex</p>
            </div>
            <Button
              onClick={() => {
                console.log('🎯 Create Journey button clicked!');
                setTemplatesModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Journey
            </Button>
          </div>

          </div>

          {/* Templates Grid - Visual Flow Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <FlowCard
                  key={template.id}
                  template={template}
                  onToggle={(status) => handleTemplateToggle(template.id, status)}
                  onCustomize={() => handleCustomize(template)}
                  onTest={() => handleTest(template)}
                  onTestSend={handleTestSend}
                  onDelete={() => handleDelete(template)}
                  updating={updating[template.id]}
                />
              ))}
            </div>
          )}

        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Active Sequences</h2>
              <p className="text-sm text-gray-600">Currently running automation sequences</p>
            </div>
          </div>
          <ActiveSequences businessId={business?.id} templates={templates} />
        </div>
      )}

      {/* Test Send Modal */}
      <TestSendModal
        isOpen={testSendModalOpen}
        onClose={() => setTestSendModalOpen(false)}
        template={selectedTemplate}
        business={business}
      />

      {/* Template Selection Modal */}
      <JourneyTemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onSelectTemplate={(template) => {
          console.log('📋 Selected template:', template);
          setTemplatesModalOpen(false);
          
          // Convert template format to wizard format
          const wizardTemplate = {
            id: template.id,
            name: template.name,
            description: template.description,
            trigger_event_type: template.trigger === 'manual' ? 'manual' : template.trigger,
            status: 'paused',
            config_json: {
              trigger_event_type: template.trigger === 'manual' ? 'manual' : template.trigger,
              steps: template.preview.map((step, idx) => {
                const stepKind = step.type === 'email' ? 'send_email' : step.type === 'sms' ? 'send_sms' : 'wait';
                const delay = step.delay === 'Immediately' ? 0 : 
                             step.delay.includes('day') || step.delay.includes('Day') ? 24 * 60 * 60 * 1000 :
                             step.delay.includes('h') || step.delay.includes('hour') ? parseFloat(step.delay) * 60 * 60 * 1000 :
                             step.delay.includes('m') || step.delay.includes('min') ? parseFloat(step.delay) * 60 * 1000 :
                             0;
                
                return {
                  kind: stepKind,
                  step_index: idx + 1,
                  wait_ms: stepKind === 'wait' ? delay : (idx === 0 ? 0 : delay),
                  message_purpose: 'custom',
                  message_config: stepKind === 'wait' ? {} : {
                    purpose: 'custom',
                    subject: step.type === 'email' ? step.text : undefined,
                    body: step.text
                  }
                };
              })
            },
            allow_manual_enroll: template.trigger === 'manual',
            quiet_hours_start: '22:00',
            quiet_hours_end: '08:00'
          };
          
          setSelectedTemplate(wizardTemplate);
          setAutomationWizardOpen(true);
        }}
        onCreateBlank={() => {
          setTemplatesModalOpen(false);
          setSelectedTemplate(null);
          setAutomationWizardOpen(true);
        }}
      />

      {/* Automation Wizard Modal - Used for both creating and customizing journeys */}
      <AutomationWizard
        isOpen={automationWizardOpen}
        onClose={() => {
          setAutomationWizardOpen(false);
          setSelectedTemplate(null); // Clear selected template when closing
        }}
        onSequenceCreated={async () => {
          setAutomationWizardOpen(false);
          setSelectedTemplate(null);
          // Refresh both templates and active sequences
          await loadTemplates();
          await loadActiveSequences();
        }}
        initialTemplate={selectedTemplate} // Pass template for customization
      />
    </div>
  );
};

export default AutomationsPage;
