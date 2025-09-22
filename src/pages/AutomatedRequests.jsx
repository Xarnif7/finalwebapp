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
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare, ArrowRight, Plus, Trash2, GripVertical, Zap, List } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";
import ActiveSequences from "@/components/automation/ActiveSequences";

const AutomatedRequestsPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
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

  // Load templates on component mount
  useEffect(() => {
    if (business?.id) {
      loadTemplates();
    }
  }, [business?.id]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
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
      console.error('Error saving template:', error);
    }
  };

  const toggleTemplateStatus = async (template) => {
    try {
      setUpdating(prev => ({ ...prev, [template.id]: true }));
      
      const newStatus = template.status === 'active' ? 'paused' : 'active';
      
      const response = await fetch(`/api/templates/${business.id}/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        alert('Error updating template status');
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Error updating template status');
    } finally {
      setUpdating(prev => ({ ...prev, [template.id]: false }));
    }
  };

  const triggerTestAutomation = async (template) => {
    try {
      // Find a customer to test with
      const customersResponse = await fetch(`/api/customers/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        const customers = customersData.customers || [];
        
        if (customers.length === 0) {
          alert('No customers found. Please add a customer first to test automation.');
          return;
        }

        // Use the first customer for testing
        const testCustomer = customers[0];
        
        const response = await fetch('/api/automation/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.access_token}`
          },
          body: JSON.stringify({
            customer_id: testCustomer.id,
            trigger_type: template.key || 'job_completed',
            trigger_data: {
              test: true,
              template_id: template.id
            }
          })
        });

        if (response.ok) {
          alert(`Test automation triggered for ${testCustomer.full_name}! Check your automation executions.`);
        } else {
          const error = await response.json();
          alert('Error triggering test: ' + error.error);
        }
      }
    } catch (error) {
      console.error('Error triggering test automation:', error);
      alert('Error triggering test automation');
    }
  };

  const openCustomizeModal = (template) => {
    setSelectedTemplate(template);
    setCustomizationData({
      name: template.name,
      description: template.config_json?.message || '',
      steps: template.channels.map((channel, index) => ({
        id: index,
        channel: channel,
        delay: index === 0 ? 0 : (template.config_json?.delay_hours || 24),
        delayUnit: 'hours',
        message: template.config_json?.message || ''
      }))
    });
    setCustomizeModalOpen(true);
  };

  const addStep = () => {
    setCustomizationData(prev => ({
      ...prev,
      steps: [...prev.steps, {
        id: Date.now(),
        channel: 'email',
        delay: 24,
        delayUnit: 'hours',
        message: 'Thank you for your business!'
      }]
    }));
  };

  const removeStep = (stepId) => {
    setCustomizationData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const updateStep = (stepId, field, value) => {
    setCustomizationData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    }));
  };

  const saveCustomization = async () => {
    try {
      const channels = customizationData.steps.map(step => step.channel);
      const configJson = {
        message: customizationData.description,
        delay_hours: customizationData.steps.length > 1 ? customizationData.steps[1].delay : 24,
        steps: customizationData.steps
      };

      const response = await fetch(`/api/templates/${business.id}/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          name: customizationData.name,
          channels: channels,
          config_json: configJson
        })
      });

      if (response.ok) {
        await loadTemplates();
        setCustomizeModalOpen(false);
        setSelectedTemplate(null);
      } else {
        alert('Error saving customization');
      }
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Error saving customization');
    }
  };

  const handleCreateSequence = async (sequenceData) => {
    try {
      const response = await fetch(`/api/templates/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(sequenceData)
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        const error = await response.json();
        alert('Error creating sequence: ' + error.error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating sequence:', error);
      throw error;
    }
  };

  const handleDeleteSequence = async (sequenceId) => {
    if (window.confirm("Are you sure you want to delete this sequence? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/templates/${business.id}/${sequenceId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });

        if (response.ok) {
          await loadTemplates();
        } else {
          alert('Error deleting sequence');
        }
      } catch (error) {
        console.error('Error deleting sequence:', error);
        alert('Error deleting sequence');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader
          title="Automated Requests"
          subtitle="Manage automation templates and trigger sequences for your customers."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading automation templates...</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'templates', label: 'Templates', icon: Zap },
    { id: 'active', label: 'Active Sequences', icon: List }
  ];

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Automated Requests"
        subtitle="Create and manage automation sequences that engage customers automatically."
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Custom Sequence
        </Button>
        {activeTab === 'templates' && (
          <Button variant="outline" onClick={() => window.location.href = '/sequences'}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Sequences
          </Button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <>
          {/* Automation Templates */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Automation Templates
              </CardTitle>
              <CardDescription>
                Pre-built automation sequences that trigger based on customer events. Customize them to fit your business needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No automation templates yet</h3>
                  <p className="text-slate-500 mb-4">Create your first automation template to get started.</p>
                  <Button onClick={() => setCreateModalOpen(true)}>
                    Create Automation Template
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <FlowCard
                      key={template.id}
                      sequence={template}
                      onToggle={toggleTemplateStatus}
                      onCustomize={openCustomizeModal}
                      onTest={triggerTestAutomation}
                      onDelete={handleDeleteSequence}
                      updating={updating[template.id]}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'active' && (
        <ActiveSequences />
      )}

      {activeTab === 'templates' && (
        <>
          {/* Manual Email Template */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Email Template</CardTitle>
              <CardDescription>
                Used for sending manual review requests via email. This template is used when you manually send requests to customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                rows={6}
                placeholder="Enter your email template..."
              />
              <div className="flex justify-end mt-4">
                <Button onClick={saveEmailTemplate} disabled={showEmailSaved}>
                  {showEmailSaved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : "Save Email Template"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Automation Status */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Automation Status</CardTitle>
              <CardDescription>
                Overview of your automation system and recent activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
                  <div className="text-sm text-slate-600">Total Templates</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {templates.filter(t => t.status === 'active').length}
                  </div>
                  <div className="text-sm text-slate-600">Active Automations</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {templates.filter(t => t.channels.includes('email')).length}
                  </div>
                  <div className="text-sm text-slate-600">Email Channels</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sequence Creator Modal */}
      <SequenceCreator
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateSequence}
        business={business}
      />

      {/* Customize Modal */}
      <Dialog open={customizeModalOpen} onOpenChange={setCustomizeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Sequence: {customizationData.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Sequence Name</Label>
                <Input
                  id="name"
                  value={customizationData.name}
                  onChange={(e) => setCustomizationData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Trigger Type</Label>
                <Badge variant="outline" className="mt-2">
                  {selectedTemplate?.trigger_type || 'Event-based'}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Default Message</Label>
              <Textarea
                id="description"
                value={customizationData.description}
                onChange={(e) => setCustomizationData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Enter the default message for this sequence..."
              />
            </div>

            {/* Sequence Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Sequence Steps</Label>
                <Button onClick={addStep} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-4">
                {customizationData.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">Step {index + 1}</span>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(step.id)}
                          className="text-red-500 hover:text-red-700 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <Label>Channel</Label>
                        <Select 
                          value={step.channel} 
                          onValueChange={(value) => updateStep(step.id, 'channel', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                              </div>
                            </SelectItem>
                            <SelectItem value="sms">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                SMS (Coming Soon)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Delay</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={step.delay}
                            onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                          <Select 
                            value={step.delayUnit} 
                            onValueChange={(value) => updateStep(step.id, 'delayUnit', value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">min</SelectItem>
                              <SelectItem value="hours">hrs</SelectItem>
                              <SelectItem value="days">days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Message</Label>
                        <Input
                          value={step.message}
                          onChange={(e) => updateStep(step.id, 'message', e.target.value)}
                          placeholder="Custom message for this step..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomization}>
              Save Customization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomatedRequestsPage;