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
      delay_days: 0,
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
  const [emailMessage, setEmailMessage] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCrm, setSelectedCrm] = useState('qbo');
  const [showFlowPreview, setShowFlowPreview] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [testServiceType, setTestServiceType] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [testSendModalOpen, setTestSendModalOpen] = useState(false);
  const [businessData, setBusinessData] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const textareaRef = useRef(null);
  const previewTimeoutRef = useRef(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Simple swear word filter
  const filterSwearWords = (text) => {
    const swearWords = ['damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'crap'];
    let filteredText = text;
    
    swearWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    return filteredText;
  };

  // Load template data when dialog opens
  useEffect(() => {
    if (isOpen && template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        trigger_type: template.trigger_type || 'event',
        channels: template.channels || ['email'],
        config_json: template.config_json || { message: '', delay_hours: 0, delay_days: 0, steps: [] },
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
      setEmailMessage(template.email_message || template.custom_message || template.config_json?.message || '');
      setSmsMessage(template.sms_message || template.custom_message || template.config_json?.message || '');
    }
  }, [isOpen, template]);

  // AI Generation function
  const generateWithAI = async () => {
    try {
      setAiGenerating(true);
      
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      const requestBody = {
        template_name: template?.name,
        template_type: template?.key,
        business_id: effectiveBusinessId,
        automation_type: template?.trigger_type
      };
      
      console.log('🤖 AI Generation Request:', requestBody);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const generatedMessage = data.message || data.generated_message || 'Thank you for choosing us! We hope you\'re satisfied with our service. Please consider leaving us a review: {{review_link}}';
        
        setCustomMessage(generatedMessage);
        setEmailMessage(generatedMessage);
        setSmsMessage(generatedMessage);
        
        setNotification({ 
          type: 'success', 
          message: 'Message generated with AI!',
          duration: 3000
        });
        
        setAiGenerating(false);
        setAiEnhancing(false);
      } else {
        const errorText = await response.text();
        console.error('AI Generation API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`AI generation failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      setNotification({ 
        type: 'error', 
        message: 'AI generation failed. Please try again.',
        duration: 5000
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // AI Enhancement function
  const enhanceWithAI = async () => {
    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message first' });
      return;
    }

    try {
      setAiEnhancing(true);
      
      const response = await fetch('/api/ai/enhance-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: customMessage,
          template_type: template?.key,
          business_id: businessId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const enhancedMessage = data.enhanced_message || data.message || customMessage + "\n\nWe truly appreciate your business and look forward to serving you again!";
        
        setCustomMessage(enhancedMessage);
        setEmailMessage(enhancedMessage);
        setSmsMessage(enhancedMessage);
        
        setNotification({ 
          type: 'success', 
          message: 'Message enhanced with AI!',
          duration: 3000
        });
      } else {
        throw new Error('AI enhancement failed');
      }
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      setNotification({ 
        type: 'error', 
        message: 'AI enhancement failed. Please try again.',
        duration: 5000
      });
    } finally {
      setAiEnhancing(false);
    }
  };

  // Save function
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setNotification({ type: 'error', message: 'Please enter a template name' });
      return;
    }

    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message' });
      return;
    }

    try {
      setSaving(true);
      
      const updatedTemplate = {
        ...template,
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        channels: formData.channels,
        service_types: formData.service_types || [],
        is_default: formData.is_default || false,
        trigger_events: formData.trigger_events || [],
        qbo_triggers: formData.qbo_triggers || {},
        config_json: {
          ...template.config_json,
          ...formData.config_json,
          message: filterSwearWords(customMessage)
        },
        custom_message: filterSwearWords(customMessage),
        email_message: filterSwearWords(emailMessage),
        sms_message: filterSwearWords(smsMessage),
        ai_generated: aiGenerating || aiEnhancing,
        message_variables: {
          customer_name: customMessage && customMessage.includes('{{customer.name}}'),
          review_link: customMessage && customMessage.includes('{{review_link}}'),
          business_name: customMessage && customMessage.includes('{{business.name}}'),
          service_date: customMessage && customMessage.includes('{{service_date}}'),
          amount: customMessage && customMessage.includes('{{amount}}')
        },
        updated_at: new Date().toISOString()
      };

      // Try to save to database first
      if (businessId && businessId !== 'null' && businessId !== 'undefined') {
        console.log('🔧 Attempting API save with businessId:', businessId, 'templateId:', template.id);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          if (!token) {
            throw new Error('No valid session found');
          }

          const response = await fetch(`/api/templates/${businessId}/${template.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...formData,
              custom_message: filterSwearWords(customMessage),
              email_message: filterSwearWords(emailMessage),
              sms_message: filterSwearWords(smsMessage),
              config_json: {
                ...formData.config_json,
                message: filterSwearWords(customMessage)
              },
              message_subject: formData.config_json?.subject || '',
              ai_generated: aiGenerating || aiEnhancing,
              service_types: formData.service_types || [],
              is_default: formData.is_default || false,
              trigger_events: formData.trigger_events || [],
              qbo_triggers: formData.qbo_triggers || {},
              message_variables: {
                customer_name: customMessage && customMessage.includes('{{customer.name}}'),
                review_link: customMessage && customMessage.includes('{{review_link}}'),
                business_name: customMessage && customMessage.includes('{{business.name}}'),
                service_date: customMessage && customMessage.includes('{{service_date}}'),
                amount: customMessage && customMessage.includes('{{amount}}')
              }
            })
          });

          if (response.ok) {
            const dbTemplate = await response.json();
            console.log('✅ API save successful:', dbTemplate);
            onSave(dbTemplate);
            setNotification({ type: 'success', message: 'Template saved successfully!' });
            onClose();
            return;
          } else {
            const errorText = await response.text();
            console.error('❌ API save failed:', response.status, errorText);
            throw new Error(`Database save failed: ${response.status} ${errorText}`);
          }
        } catch (dbError) {
          console.log('❌ Database save failed, saving to localStorage as backup:', dbError);
        }
      }
      
      // Fallback to localStorage
      const userEmail = user?.email || 'unknown';
      const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      try {
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        
        const templateData = {
          ...updatedTemplate,
          id: template.id,
          business_id: `mock-business-${sanitizedEmail}`,
          user_email: userEmail,
          last_saved: new Date().toISOString()
        };
        
        savedTemplates[template.id] = templateData;
        localStorage.setItem(localStorageKey, JSON.stringify(savedTemplates));
        
        console.log('🔒 BULLETPROOF SAVE COMPLETE:', {
          userEmail,
          localStorageKey,
          templateId: template.id,
          templateName: updatedTemplate.name,
          saved: 'SUCCESS',
          timestamp: new Date().toISOString()
        });
        
        onSave(updatedTemplate);
        setNotification({ type: 'success', message: 'Template saved successfully!' });
        onClose();
      } catch (error) {
        console.error('❌ Save failed:', error);
        setNotification({ type: 'error', message: 'Failed to save template' });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setNotification({ type: 'error', message: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  // Test send function
  const handleTestSend = async () => {
    const hasEmail = testEmail.trim() && formData.channels.includes('email');
    const hasSms = testPhone.trim() && formData.channels.includes('sms');
    
    if (!hasEmail && !hasSms) {
      setNotification({ type: 'error', message: 'Please enter an email address and/or phone number for testing' });
      return;
    }

    if (!customMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a message first' });
      return;
    }

    setAiTesting(true);
    try {
      const channels = [];
      if (hasEmail) channels.push('email');
      if (hasSms) channels.push('sms');

      const response = await fetch('/api/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          phone: testPhone,
          message: customMessage,
          template_name: formData.name,
          service_type: testServiceType,
          business_id: businessId,
          channels: channels
        })
      });

      if (response.ok) {
        const result = await response.json();
        setNotification({ type: 'success', message: result.message });
        setTestEmail('');
        setTestPhone('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Test send failed');
      }
    } catch (error) {
      console.error('Error sending test:', error);
      setNotification({ type: 'error', message: error.message || 'Failed to send test message' });
    } finally {
      setAiTesting(false);
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
                  <CardTitle className="text-lg">Customize your automated messages</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Write the messages that will be sent to your clients
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Message */}
              {formData.channels.includes('email') && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Message
                  </Label>
                  <Textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your email message here... Use variables like {{customer_name}} and {{review_link}}"
                    className="min-h-[100px]"
                  />
                </div>
              )}

              {/* SMS Message */}
              {formData.channels.includes('sms') && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    SMS Message
                  </Label>
                  <Textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Enter your SMS message here... Keep it short and sweet!"
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">SMS messages should be under 160 characters for best delivery</p>
                </div>
              )}

              {/* Combined Message (if only one channel) */}
              {formData.channels.length === 1 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Message Content
                  </Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => {
                      setCustomMessage(e.target.value);
                      if (formData.channels.includes('email')) setEmailMessage(e.target.value);
                      if (formData.channels.includes('sms')) setSmsMessage(e.target.value);
                    }}
                    placeholder="Enter your message here... Use variables like {{customer_name}} and {{review_link}}"
                    className="min-h-[120px]"
                  />
                </div>
              )}
                
              {/* AI Enhancement Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={enhanceWithAI}
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
                  onClick={generateWithAI}
                  disabled={aiGenerating}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  {aiGenerating ? 'Generating...' : 'Generate with AI'}
                </Button>
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
                        if (formData.channels.includes('email')) setEmailMessage(prev => prev + variable.key);
                        if (formData.channels.includes('sms')) setSmsMessage(prev => prev + variable.key);
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
              {(customMessage || emailMessage || smsMessage) && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {customMessage || emailMessage || smsMessage}
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
                  <Label htmlFor="delayDays" className="text-sm font-medium">
                    Delay (Days)
                  </Label>
                  <Input
                    id="delayDays"
                    type="number"
                    min="0"
                    value={formData.config_json.delay_days || 0}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config_json: {
                        ...prev.config_json,
                        delay_days: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="delayHours" className="text-sm font-medium">
                    Delay (Hours)
                  </Label>
                  <Input
                    id="delayHours"
                    type="number"
                    min="0"
                    max="23"
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
                triggers={formData.qbo_triggers}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Test */}
                  {formData.channels.includes('email') && (
                    <div>
                      <Label htmlFor="testEmail" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="testEmail"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="mt-2"
                      />
                    </div>
                  )}
                  
                  {/* SMS Test */}
                  {formData.channels.includes('sms') && (
                    <div>
                      <Label htmlFor="testPhone" className="text-sm font-medium">
                        Phone Number
                      </Label>
                      <Input
                        id="testPhone"
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
                
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
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Test Instructions:</strong> Enter your email and/or phone number to receive test messages using your custom template. 
                    {formData.channels.includes('email') && ' Email will be sent via Resend.'}
                    {formData.channels.includes('sms') && ' SMS will be sent via your approved number (+18775402797).'}
                  </p>
                </div>
                
                <Button
                  onClick={handleTestSend}
                  disabled={aiTesting || !customMessage.trim() || (!testEmail.trim() && !testPhone.trim())}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {aiTesting ? 'Sending Test...' : 'Send Test Message'}
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