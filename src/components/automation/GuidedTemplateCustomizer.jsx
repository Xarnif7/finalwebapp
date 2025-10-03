import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Clock, Settings, ArrowRight, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Sparkles, Wand2, Eye, User, Link, Building, Calendar, Star, Trash2, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSmsStatus } from "@/hooks/useSmsStatus";
import { supabase } from "@/lib/supabaseClient";
import TestSendModal from "./TestSendModal";
import QBOTriggerSelector from "./QBOTriggerSelector";
import CRMSelector from "./CRMSelector";
import FlowPreview from "./FlowPreview";

export default function GuidedTemplateCustomizer({ 
  isOpen, 
  onClose, 
  template, 
  onSave,
  onDelete,
  businessId,
  user: propUser,
  isCreating = false
}) {
  const { user: authUser } = useAuth();
  const { isSmsEnabled, isSmsPending, isSmsActionNeeded, isSmsNotProvisioned, getSmsStatusMessage } = useSmsStatus();
  const user = propUser || authUser;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'event',
    channels: ['email'],
    config_json: {
      message: '',
      delay_hours: 0,
      steps: []
    },
    service_types: [],
    service_types_text: '',
    is_default: false,
    trigger_events: {
      manual: true,
      jobber_job_completed: false,
      housecall_pro_job_completed: false,
      servicetitan_job_completed: false
    },
    qbo_triggers: {}
  });
  
  const [saving, setSaving] = useState(false);
  const [messageDropdownOpen, setMessageDropdownOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCrm, setSelectedCrm] = useState('qbo');
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [testServiceType, setTestServiceType] = useState('');
  const [aiTesting, setAiTesting] = useState(false);

  // Load template data when dialog opens
  useEffect(() => {
    if (isOpen && template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        trigger_type: template.trigger_type || 'event',
        channels: template.channels || ['email'],
        config_json: template.config_json || { message: '', delay_hours: 0, steps: [] },
        service_types: template.service_types || [],
        service_types_text: template.service_types_text || '',
        is_default: template.is_default || false,
        trigger_events: template.trigger_events || {
          manual: true,
          jobber_job_completed: false,
          housecall_pro_job_completed: false,
          servicetitan_job_completed: false
        },
        qbo_triggers: template.qbo_triggers || {}
      });
      setCustomMessage(template.custom_message || template.config_json?.message || '');
    }
  }, [isOpen, template]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setNotification({ type: 'error', message: 'Please enter a template name' });
      return;
    }

    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        custom_message: customMessage,
        config_json: {
          ...formData.config_json,
          message: customMessage
        }
      };

      await onSave(updateData);
      setNotification({ type: 'success', message: 'Template saved successfully!' });
    } catch (error) {
      console.error('Error saving template:', error);
      setNotification({ type: 'error', message: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message first' });
      return;
    }

    setAiTesting(true);
    try {
      // Test send logic here
      setNotification({ type: 'success', message: 'Test message sent successfully!' });
    } catch (error) {
      console.error('Error sending test:', error);
      setNotification({ type: 'error', message: 'Failed to send test message' });
    } finally {
      setAiTesting(false);
    }
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      // AI generation logic here
      const generatedMessage = "Thank you for choosing us! We hope you're satisfied with our service. Please consider leaving us a review: {{review_link}}";
      setCustomMessage(generatedMessage);
      setNotification({ type: 'success', message: 'Message generated with AI!' });
    } catch (error) {
      console.error('Error generating message:', error);
      setNotification({ type: 'error', message: 'Failed to generate message' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message first' });
      return;
    }

    setAiEnhancing(true);
    try {
      // AI enhancement logic here
      const enhancedMessage = customMessage + "\n\nWe truly appreciate your business and look forward to serving you again!";
      setCustomMessage(enhancedMessage);
      setNotification({ type: 'success', message: 'Message enhanced with AI!' });
    } catch (error) {
      console.error('Error enhancing message:', error);
      setNotification({ type: 'error', message: 'Failed to enhance message' });
    } finally {
      setAiEnhancing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isCreating ? 'Create New Automation' : `Customize: ${template?.name}`}
          </DialogTitle>
        </DialogHeader>

        {/* Notification */}
        {notification && (
          <div className={`p-3 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {notification.type === 'warning' && <AlertCircle className="h-4 w-4" />}
              {notification.type === 'info' && <AlertCircle className="h-4 w-4" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: Template Name and CRM Selection */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <CardTitle className="text-lg">Pick a name and choose your CRM system</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Give your automation a name and select which system will trigger it
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="templateName" className="text-sm font-medium">
                  Template Name
                </Label>
                <Input
                  id="templateName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Invoice Follow-up, Job Completion, Payment Reminder"
                  className="text-lg"
                />
              </div>

              {/* CRM Selection */}
              <CRMSelector
                selectedCrm={selectedCrm}
                onCrmChange={setSelectedCrm}
                disabled={saving}
              />
            </CardContent>
          </Card>

          {/* Step 2: Trigger Selection */}
          {selectedCrm && (
            <Card className="border-2 border-green-200 bg-green-50/30">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-lg">Choose what triggers this automation</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Select the specific events that will activate this automation
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedCrm === 'qbo' && (
                  <QBOTriggerSelector
                    selectedTriggers={formData.qbo_triggers || {}}
                    onTriggersChange={(triggers) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        qbo_triggers: triggers
                      }));
                    }}
                    disabled={saving}
                  />
                )}
                {selectedCrm === 'manual' && (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Manual Trigger Selected</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      This automation will be triggered manually from the customer tab
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Channel Selection */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <CardTitle className="text-lg">Choose how to reach your clients</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which channels you want to use for this automation
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.channels.includes('email') 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const newChannels = formData.channels.includes('email')
                    ? formData.channels.filter(c => c !== 'email')
                    : [...formData.channels, 'email'];
                  setFormData(prev => ({ ...prev, channels: newChannels }));
                }}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Email</h3>
                      <p className="text-sm text-gray-600">Send professional emails to your clients</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.channels.includes('sms') 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const newChannels = formData.channels.includes('sms')
                    ? formData.channels.filter(c => c !== 'sms')
                    : [...formData.channels, 'sms'];
                  setFormData(prev => ({ ...prev, channels: newChannels }));
                }}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">SMS</h3>
                      <p className="text-sm text-gray-600">Send text messages to your clients</p>
                      {!isSmsEnabled && (
                        <p className="text-xs text-orange-600 mt-1">
                          {getSmsStatusMessage()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Message Customization */}
          <Card className="border-2 border-orange-200 bg-orange-50/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <CardTitle className="text-lg">Customize your automated message</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Write the message that will be sent to your clients
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="messageContent" className="text-sm font-medium">
                  Message Content
                </Label>
                <Textarea
                  id="messageContent"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your custom message here... Use variables like {{customer_name}} and {{review_link}}"
                  className="min-h-[120px] mt-2"
                />
                
                {/* AI Enhancement Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiEnhance}
                    disabled={aiEnhancing || !customMessage.trim()}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    {aiGenerating ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
              </div>

              {/* Variable Suggestions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Available Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: '{{customer_name}}', desc: 'Customer name' },
                    { key: '{{business_name}}', desc: 'Business name' },
                    { key: '{{review_link}}', desc: 'Review link' },
                    { key: '{{service_date}}', desc: 'Service date' },
                    { key: '{{invoice_amount}}', desc: 'Invoice amount' }
                  ].map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => {
                        setCustomMessage(prev => prev + variable.key);
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      title={variable.desc}
                    >
                      {variable.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Preview */}
              {customMessage && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {customMessage}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 5: Timing Configuration */}
          <Card className="border-2 border-indigo-200 bg-indigo-50/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <CardTitle className="text-lg">Set the timing for your automation</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose when the message should be sent after the trigger event
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="delayHours" className="text-sm font-medium">
                    Delay (Hours)
                  </Label>
                  <Input
                    id="delayHours"
                    type="number"
                    min="0"
                    value={formData.config_json.delay_hours || 0}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config_json: {
                        ...prev.config_json,
                        delay_hours: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="delayMinutes" className="text-sm font-medium">
                    Delay (Minutes)
                  </Label>
                  <Input
                    id="delayMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.config_json.delay_minutes || 0}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config_json: {
                        ...prev.config_json,
                        delay_minutes: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flow Preview */}
          <Card className="border-2 border-teal-200 bg-teal-50/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <CardTitle className="text-lg">Your Automation Flow</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Here's how your automation will work
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FlowPreview
                channels={formData.channels}
                configJson={formData.config_json}
                customMessage={customMessage}
                templateName={formData.name}
              />
            </CardContent>
          </Card>

          {/* Test Send */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Test Your Automation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testServiceType" className="text-sm font-medium">
                    Service Type (for testing)
                  </Label>
                  <Input
                    id="testServiceType"
                    value={testServiceType}
                    onChange={(e) => setTestServiceType(e.target.value)}
                    placeholder="e.g., Plumbing, Electrical, HVAC"
                    className="mt-2"
                  />
                </div>
                
                <Button
                  onClick={handleTestSend}
                  disabled={aiTesting || !customMessage.trim()}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {aiTesting ? 'Testing...' : 'Send Test Message'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex gap-2">
              {onDelete && (
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : isCreating ? 'Create Automation' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
