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
        delay: index === 0 ? 0 : (template.config_json?.delay_hours ?? 24),
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
        setCreateModalOpen(false);
      } else {
        const error = await response.json();
        alert('Error creating sequence: ' + error.error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Error creating sequence');
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

  const getChannelIcon = (channel) => {
    return channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const getChannelColor = (channel) => {
    return channel === 'sms' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
        subtitle="Create and manage automation sequences with beautiful visual flow cards and full customization."
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
                    <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatTimeAgo(template.updated_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(template.status)} text-xs font-medium`}>
                              {template.status}
                            </Badge>
                            <Switch 
                              checked={template.status === 'active'} 
                              onCheckedChange={() => toggleTemplateStatus(template)}
                              disabled={updating[template.id]}
                            />
                          </div>
                        </div>

                        {/* Visual Flow - THIS IS THE KEY FEATURE */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Trigger */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">Trigger</span>
                            </div>
                            
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            
                            {/* Steps */}
                            {template.channels.map((channel, index) => {
                              const stepDelay = template.config_json?.steps?.[index]?.delay || 
                                               (index > 0 ? template.config_json?.delay_hours ?? 24 : 0);
                              const delayUnit = template.config_json?.steps?.[index]?.delayUnit || 'hours';
                              
                              return (
                                <React.Fragment key={index}>
                                  {/* Delay indicator for non-first steps */}
                                  {index > 0 && stepDelay > 0 && (
                                    <>
                                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg">
                                        <Clock className="w-4 h-4 text-orange-600" />
                                        <span className="text-sm font-medium text-orange-700">
                                          {delayUnit === 'hours' ? `${stepDelay}h` : 
                                           delayUnit === 'days' ? `${stepDelay}d` : 
                                           `${stepDelay}m`}
                                        </span>
                                      </div>
                                      <ArrowRight className="w-4 h-4 text-gray-400" />
                                    </>
                                  )}
                                  
                                  {/* Channel */}
                                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${getChannelColor(channel)}`}>
                                    {getChannelIcon(channel)}
                                    <span className="text-sm font-medium">
                                      {channel === 'sms' ? 'SMS' : 'Email'}
                                    </span>
                                  </div>
                                  
                                  {index < template.channels.length - 1 && (
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {template.description || template.config_json?.message || 'Automated follow-up sequence'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openCustomizeModal(template)}
                            className="flex-1"
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Customize
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => triggerTestAutomation(template)}
                            className="flex-1"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'active' && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Active Sequences
            </CardTitle>
            <p className="text-sm text-slate-600">
              Currently running automation sequences that are actively engaging your customers.
            </p>
          </CardHeader>
          <CardContent>
            {templates.filter(t => t.status === 'active').length === 0 ? (
              <div className="text-center py-8">
                <Pause className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No active sequences</h3>
                <p className="text-slate-500 mb-4">Start an automation sequence to see it here.</p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  Create Sequence
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.filter(t => t.status === 'active').map((sequence) => (
                  <div key={sequence.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900 mb-1">
                          {sequence.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {sequence.description || sequence.config_json?.message || 'Automated follow-up sequence'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          Active
                        </Badge>
                        <Switch 
                          checked={sequence.status === 'active'} 
                          onCheckedChange={() => toggleTemplateStatus(sequence)}
                          disabled={updating[sequence.id]}
                        />
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-600">Channels:</span>
                      {sequence.channels.map((channel, index) => (
                        <div key={index} className={`flex items-center gap-1 px-2 py-1 rounded ${getChannelColor(channel)}`}>
                          {getChannelIcon(channel)}
                          <span className="text-xs font-medium">
                            {channel === 'sms' ? 'SMS' : 'Email'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Visual Flow */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        <CheckCircle className="w-3 h-3" />
                        <span>Trigger</span>
                      </div>
                      
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      
                      {sequence.channels.map((channel, index) => {
                        const stepDelay = sequence.config_json?.steps?.[index]?.delay || 
                                         (index > 0 ? sequence.config_json?.delay_hours ?? 24 : 0);
                        const delayUnit = sequence.config_json?.steps?.[index]?.delayUnit || 'hours';
                        
                        return (
                          <React.Fragment key={index}>
                            {/* Delay indicator for non-first steps */}
                            {index > 0 && stepDelay > 0 && (
                              <>
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {delayUnit === 'hours' ? `${stepDelay}h` : 
                                     delayUnit === 'days' ? `${stepDelay}d` : 
                                     `${stepDelay}m`}
                                  </span>
                                </div>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                              </>
                            )}
                            
                            {/* Channel */}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getChannelColor(channel)}`}>
                              {getChannelIcon(channel)}
                              <span>{channel === 'sms' ? 'SMS' : 'Email'}</span>
                            </div>
                            
                            {index < sequence.channels.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* Create Sequence Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Automation Sequence</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Sequence Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Post-Visit Review Request"
                />
              </div>
              <div>
                <Label htmlFor="trigger_event">Trigger Event</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job_completed">
                      <div>
                        <div className="font-medium">Job Completed</div>
                        <div className="text-xs text-slate-500">Triggered when a job/service is marked complete</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="invoice_paid">
                      <div>
                        <div className="font-medium">Invoice Paid</div>
                        <div className="text-xs text-slate-500">Triggered when payment is received</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="service_completed">
                      <div>
                        <div className="font-medium">Service Completed</div>
                        <div className="text-xs text-slate-500">Triggered when a service appointment ends</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="customer_created">
                      <div>
                        <div className="font-medium">New Customer</div>
                        <div className="text-xs text-slate-500">Triggered when a new customer is added</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Sequence Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this automation sequence does..."
                rows={3}
              />
            </div>

            {/* Sequence Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Sequence Steps</Label>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Step 1</span>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label>Channel</Label>
                      <Select>
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
                              SMS
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
                          min="0"
                          defaultValue="24"
                          className="flex-1"
                        />
                        <Select defaultValue="hours">
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
                      <Label>Subject</Label>
                      <Input
                        placeholder="Email subject..."
                      />
                    </div>

                    <div>
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Message content..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setCreateModalOpen(false)}>
              Create Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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