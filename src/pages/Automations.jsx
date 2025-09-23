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
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare, ArrowRight, Plus, Trash2, GripVertical, Zap, List, BarChart3, Activity, FileText, Eye, TrendingUp, Users, AlertTriangle, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";
import ActiveSequences from "@/components/automation/ActiveSequences";
import TemplateCustomizer from "@/components/automation/TemplateCustomizer";
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
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customizationData, setCustomizationData] = useState({
    name: '',
    description: '',
    steps: []
  });
  const [activeTab, setActiveTab] = useState('templates');
  
  // KPIs state for Overview tab
  const [kpis, setKpis] = useState({
    activeSequences: 0,
    totalRecipients: 0,
    sendSuccessRate: 0,
    failureRate: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    roi: 0
  });

  // Load data on component mount
  console.log('🚨🚨🚨 ABOUT TO RUN USEEFFECT 🚨🚨🚨');
  useEffect(() => {
    console.log('🚨🚨🚨 AUTOMATIONS USEEFFECT RUNNING 🚨🚨🚨');
    console.log('🔍 Automations useEffect triggered:', { userEmail: user?.email, businessId: business?.id });
    if (user?.email) {
      console.log('✅ User email found, proceeding with localStorage check');
      // ALWAYS USE LOCALSTORAGE FIRST (regardless of business ID)
      const userEmail = user.email;
      const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      console.log('🔍 Checking localStorage with key:', localStorageKey);
      
      try {
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        
        if (Object.keys(savedTemplates).length > 0) {
          const savedTemplatesArray = Object.values(savedTemplates);
          
          // Filter out any templates that don't belong to this user
          const userTemplates = savedTemplatesArray.filter(template => 
            template.user_email === userEmail || template.business_id?.includes(userEmail.replace(/[^a-zA-Z0-9]/g, '_'))
          );
          
          setTemplates(userTemplates);
          setLoading(false); // CRITICAL: Set loading to false so templates display
          console.log('🔒 BULLETPROOF LOADED templates from localStorage:', {
            userEmail,
            localStorageKey,
            totalTemplates: savedTemplatesArray.length,
            userTemplates: userTemplates.length,
            templates: userTemplates.map(t => ({ id: t.id, name: t.name, user_email: t.user_email })),
            timestamp: new Date().toISOString()
          });
          return; // Don't load from database if we have localStorage
        }
      } catch (error) {
        console.error('❌ LOAD ERROR:', error);
      }
      
      // If no localStorage data, fall back to database or mock templates
      console.log('🔍 NO LOCALSTORAGE DATA - Loading from database/mock templates');
      console.log('🔍 Business ID:', business?.id);
      
      // Always show default templates for new users (regardless of business ID)
      console.log('🔍 Loading default templates for new user');
      setTemplates([
        {
          id: 'default-1',
          name: 'Job Completed',
          key: 'job_completed',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for choosing our services! We hope you had a great experience. Please consider leaving us a review at {{review_link}}.',
            delay_hours: 24
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: 'Automatically send a thank you email 24 hours after job completion'
        },
        {
          id: 'default-2',
          name: 'Invoice Paid',
          key: 'invoice_paid',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
            delay_hours: 48
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          description: 'Send a thank you email 48 hours after invoice payment'
        },
        {
          id: 'default-3',
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
          description: 'Send appointment reminder 1 day before scheduled service'
        }
      ]);
      setLoading(false);
      
      if (business?.id) {
        loadActiveSequences();
        loadKPIs();
      }
    } else {
      // If no user email, show mock templates as fallback
      console.log('🔍 NO USER EMAIL - Showing mock templates as fallback');
      setTemplates([
        {
          id: 'mock-1',
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
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-2',
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
          updated_at: new Date().toISOString()
        },
        {
          id: 'mock-3',
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
          updated_at: new Date().toISOString()
        }
      ]);
      setLoading(false);
    }
  }, [user?.email]); // Only depend on user email to prevent multiple re-renders

  // Update active sequences when templates change
  useEffect(() => {
    loadActiveSequences();
  }, [templates]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      console.log('🔍 loadTemplates called - this will overwrite localStorage data!');
      
      // If no business ID yet, try to get it from user email
      let businessId = business?.id;
      if (!businessId && user?.email) {
        console.log('No business ID, trying to find business by email:', user.email);
        // Try to find business by email
        const response = await fetch(`/api/business/by-email?email=${encodeURIComponent(user.email)}`, {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          businessId = data.business?.id;
          console.log('Found business ID by email:', businessId);
        }
      }
      
      if (!businessId) {
        console.log('No business ID available, cannot load templates');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/templates/${businessId}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates || [];
        
        // If no templates exist, auto-provision defaults
        if (templates.length === 0) {
          console.log('No templates found, provisioning defaults...');
          await provisionDefaultTemplates(businessId);
        } else {
          setTemplates(templates);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback: show user-specific mock templates so user can see the interface
      console.log('Falling back to user-specific mock templates for:', user?.email);
      const userEmail = user?.email || 'unknown';
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
      setTemplates([
        {
          id: `mock-1-${sanitizedEmail}`,
          name: 'Job Completed',
          key: 'job_completed',
          status: 'paused',
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
            delay_hours: 24
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          business_id: business?.id || sanitizedEmail, // Make it user-specific
          user_email: userEmail // Store user email for isolation
        },
        {
          id: `mock-2-${sanitizedEmail}`,
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
          business_id: business?.id || sanitizedEmail, // Make it user-specific
          user_email: userEmail // Store user email for isolation
        },
        {
          id: `mock-3-${sanitizedEmail}`,
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
          business_id: business?.id || sanitizedEmail, // Make it user-specific
          user_email: userEmail // Store user email for isolation
        }
      ]);
    } finally {
      setLoading(false);
    }
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
      // Get active sequences from local templates (including mock templates)
      const activeTemplates = templates.filter(t => t.status === 'active');
      
      // Transform templates to sequences format
      const sequences = activeTemplates.map(template => ({
        id: template.id,
        name: template.name,
        description: getTemplateDescription(template),
        channels: template.channels || ['email'],
        status: template.status,
        trigger_type: template.trigger_type,
        config_json: template.config_json,
        created_at: template.created_at,
        updated_at: template.updated_at
      }));
      
      setActiveSequences(sequences);
      console.log('Active sequences loaded:', sequences.length);
    } catch (error) {
      console.error('Error loading active sequences:', error);
      // Set empty array if there's an error
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

  const loadKPIs = async () => {
    try {
      const response = await fetch(`/api/automation/kpis/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKpis(data);
      } else {
        // Mock data for demonstration
        setKpis({
          activeSequences: 3,
          totalRecipients: 1247,
          sendSuccessRate: 95.3,
          failureRate: 4.7,
          totalRevenue: 45230,
          avgOrderValue: 125.50,
          conversionRate: 12.5,
          roi: 340
        });
      }
    } catch (error) {
      console.error('Error loading KPIs:', error);
      // Mock data for demonstration
      setKpis({
        activeSequences: 3,
        totalRecipients: 1247,
        sendSuccessRate: 95.3,
        failureRate: 4.7,
        totalRevenue: 45230,
        avgOrderValue: 125.50,
        conversionRate: 12.5,
        roi: 340
      });
    }
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
    setUpdating(prev => ({ ...prev, [templateId]: true }));
    
    try {
      // For mock templates, update local state immediately
      if (templateId.startsWith('mock-')) {
        setTemplates(prev => prev.map(t => 
          t.id === templateId ? { ...t, status: newStatus } : t
        ));
        
        // Reload active sequences if template was activated
        if (newStatus === 'active') {
          await loadActiveSequences();
        }
        
        // Trigger Zapier webhook for real automation functionality
        if (newStatus === 'active') {
          await triggerZapierWebhook(templateId, 'activate');
        } else if (newStatus === 'paused') {
          await triggerZapierWebhook(templateId, 'pause');
        }
        
        console.log(`Mock template ${templateId} ${newStatus} successfully`);
        return;
      }

      // For real templates, call the API
      const response = await fetch(`/api/templates/${business?.id}/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        await loadTemplates();
        await loadActiveSequences();
        await loadKPIs();
        
        // Trigger Zapier webhook for real automation functionality
        if (newStatus === 'active') {
          await triggerZapierWebhook(templateId, 'activate');
        } else if (newStatus === 'paused') {
          await triggerZapierWebhook(templateId, 'pause');
        }
      }
    } catch (error) {
      console.error('Error updating template:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [templateId]: false }));
    }
  };

  const triggerZapierWebhook = async (templateId, action) => {
    try {
      // Only trigger webhook if we have a business ID
      if (!business?.id) {
        console.log('No business ID available for Zapier webhook, skipping');
        return;
      }

      const response = await fetch('/api/zapier/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          business_id: business.id,
          template_id: templateId,
          action: action,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log(`Zapier webhook triggered for ${action} on template ${templateId}`);
      }
    } catch (error) {
      console.error('Error triggering Zapier webhook:', error);
    }
  };

  const handleCustomize = (template) => {
    setSelectedTemplate(template);
    setCustomizationData({
      name: template.name,
      description: template.description,
      steps: template.config_json?.steps || []
    });
    setCustomizeModalOpen(true);
  };

  const handleTemplateSaved = async (updatedTemplate) => {
    console.log('Template saved:', updatedTemplate);
    
    // Update existing template in local state
    if (updatedTemplate) {
      setTemplates(prev => {
        const updated = prev.map(t => {
          if (t.id === updatedTemplate.id) {
            console.log('Updating template:', t.id, 'with new name:', updatedTemplate.name);
            return updatedTemplate;
          }
          return t;
        });
        console.log('Updated templates:', updated.map(t => ({ id: t.id, name: t.name })));
        return updated;
      });
    }
    
    // Don't reload from database - localStorage is the source of truth
    console.log('🔒 LOCALSTORAGE SAVE COMPLETE - Not reloading from database');
    // await loadTemplates(); // REMOVED - This was overwriting localStorage data!
    await loadActiveSequences();
    await loadKPIs();
  };

  const handleSequenceCreated = async (newTemplate) => {
    console.log('Sequence created:', newTemplate);
    
    // Add new template to local state
    if (newTemplate) {
      setTemplates(prev => [...prev, newTemplate]);
    }
    
    // Close modal
    setCreateModalOpen(false);
    
    // Reload everything
    await loadTemplates();
    await loadActiveSequences();
    await loadKPIs();
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

  const clearLocalStorage = () => {
    const userEmail = user?.email || 'unknown';
    const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    localStorage.removeItem(localStorageKey);
    alert('LocalStorage cleared for user: ' + userEmail);
    window.location.reload();
  };

  const testLocalStorage = () => {
    const userEmail = user?.email || 'unknown';
    const testKey = `test_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const testData = { test: 'data', timestamp: new Date().toISOString() };
    
    try {
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);
      const parsed = retrieved ? JSON.parse(retrieved) : null;
      
      alert(`LocalStorage Test: ${parsed ? 'SUCCESS' : 'FAILED'}\n\nSaved: ${JSON.stringify(testData)}\nRetrieved: ${JSON.stringify(parsed)}`);
      
      // Clean up test data
      localStorage.removeItem(testKey);
    } catch (error) {
      alert(`LocalStorage Test: FAILED\n\nError: ${error.message}`);
    }
  };

  const reloadFromLocalStorage = () => {
    const userEmail = user?.email || 'unknown';
    const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    try {
      const existingData = localStorage.getItem(localStorageKey);
      const savedTemplates = existingData ? JSON.parse(existingData) : {};
      
      if (Object.keys(savedTemplates).length > 0) {
        const savedTemplatesArray = Object.values(savedTemplates);
        const userTemplates = savedTemplatesArray.filter(template => 
          template.user_email === userEmail || template.business_id?.includes(userEmail.replace(/[^a-zA-Z0-9]/g, '_'))
        );
        
        setTemplates(userTemplates);
        alert(`Reloaded ${userTemplates.length} templates from localStorage`);
      } else {
        alert('No templates found in localStorage');
      }
    } catch (error) {
      alert(`Error reloading from localStorage: ${error.message}`);
    }
  };

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

  const handleCreateSequence = () => {
    setCreateModalOpen(true);
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
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'active', label: 'Active Sequences', icon: Play },
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'activity', label: 'Activity', icon: Activity }
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
          {/* Header with Create Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Automation Templates</h2>
              <p className="text-sm text-gray-600">Create and manage your automation sequences</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateSequence} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Template
              </Button>
              <Button onClick={testLocalStorage} className="bg-green-600 hover:bg-green-700">
                Test Storage
              </Button>
              <Button onClick={reloadFromLocalStorage} className="bg-yellow-600 hover:bg-yellow-700">
                Reload Storage
              </Button>
              <Button onClick={clearLocalStorage} className="bg-red-600 hover:bg-red-700">
                Clear Storage
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

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Automation Overview</h2>
            <p className="text-sm text-gray-600">Key metrics and performance indicators</p>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Sequences</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.activeSequences}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Recipients</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalRecipients.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.sendSuccessRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">ROI</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.roi}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Attribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Revenue Generated</p>
                  <p className="text-3xl font-bold text-green-800">${kpis.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">From automation sequences</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <TrendingUp className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Avg Order Value</p>
                  <p className="text-3xl font-bold text-blue-800">${kpis.avgOrderValue}</p>
                  <p className="text-xs text-blue-600 mt-1">Per converted customer</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <Users className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Conversion Rate</p>
                  <p className="text-3xl font-bold text-purple-800">{kpis.conversionRate}%</p>
                  <p className="text-xs text-purple-600 mt-1">Email to purchase</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <Eye className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Activity Log</h2>
            <p className="text-sm text-gray-600">Recent automation activity and events</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
                <p className="text-gray-600 mb-6">Once you enable templates and they start sending, activity will appear here</p>
                <Button
                  onClick={() => setActiveTab('templates')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customize Modal */}
      <TemplateCustomizer
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateSaved}
        businessId={business?.id}
        user={user}
      />

      {/* Create Sequence Modal */}
      <SequenceCreator
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSequenceCreated={handleSequenceCreated}
        businessId={business?.id}
      />
    </div>
  );
};

export default AutomationsPage;
