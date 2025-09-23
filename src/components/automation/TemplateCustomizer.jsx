import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, MessageSquare, Clock, Settings, ArrowRight, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Sparkles, Wand2, Eye, User, Link, Building, Calendar, Star } from "lucide-react";

export default function TemplateCustomizer({ 
  isOpen, 
  onClose, 
  template, 
  onSave,
  businessId,
  user 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'event',
    channels: ['email'],
    config_json: {
      message: '',
      delay_hours: 24,
      steps: []
    }
  });
  const [saving, setSaving] = useState(false);
  const [messageDropdownOpen, setMessageDropdownOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [notification, setNotification] = useState(null);
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

  // Default messages for each automation type
  const getDefaultMessage = (templateKey, templateName) => {
    const defaults = {
      'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
      'mock-1': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'mock-2': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'mock-3': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
    };
    
    return defaults[templateKey] || defaults[templateName?.toLowerCase()] || 'Thank you for your business! Please leave us a review at {{review_link}}.';
  };

  useEffect(() => {
    if (template) {
      const defaultMessage = getDefaultMessage(template.key, template.name);
      
      // BULLETPROOF LOAD SYSTEM
      const userEmail = user?.email || 'unknown';
      const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      let savedTemplate = null;
      
      try {
        // Try localStorage first
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        savedTemplate = savedTemplates[template.id];
        
        // If not found in localStorage, try sessionStorage
        if (!savedTemplate) {
          const sessionKey = `session_blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${template.id}`;
          const sessionData = sessionStorage.getItem(sessionKey);
          if (sessionData) {
            savedTemplate = JSON.parse(sessionData);
            console.log('🔄 LOADED from sessionStorage fallback:', sessionKey);
          }
        }
        
        console.log('🔍 BULLETPROOF LOAD COMPLETE:', {
          templateId: template.id,
          userEmail,
          localStorageKey,
          found: savedTemplate ? 'YES' : 'NO',
          source: savedTemplate ? (savedTemplate.last_saved ? 'localStorage' : 'sessionStorage') : 'none',
          templateName: template.name,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ LOAD ERROR:', error);
        savedTemplate = null;
      }
      
      // Use saved template data if available, otherwise use template data
      const templateData = savedTemplate || template;
      const currentMessage = templateData.custom_message || templateData.config_json?.message || defaultMessage;
      
      setFormData({
        name: templateData.name || '',
        description: templateData.description || '',
        trigger_type: templateData.trigger_type || 'event',
        channels: templateData.channels || ['email'],
        config_json: {
          message: currentMessage,
          delay_hours: templateData.config_json?.delay_hours || 24,
          delay_days: templateData.config_json?.delay_days || 0,
          steps: templateData.config_json?.steps || []
        }
      });
      
      setCustomMessage(currentMessage);
      generatePreview(currentMessage);
    }
  }, [template, user?.email]);

  // Variable insertion function
  const insertVariable = (variable) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = customMessage.substring(0, start) + variable + customMessage.substring(end);
      setCustomMessage(newMessage);
      setFormData(prev => ({
        ...prev,
        config_json: { ...prev.config_json, message: newMessage }
      }));
      generatePreview(newMessage);
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  // Debounced preview generation for real-time updates
  const generatePreviewDebounced = (message) => {
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Immediate preview for common variables
    const immediatePreview = message
      .replace(/\{\{customer\.name\}\}/g, 'John Smith')
      .replace(/\{\{business\.name\}\}/g, 'Your Business')
      .replace(/\{\{review_link\}\}/g, 'https://g.page/your-business/review')
      .replace(/\{\{service_date\}\}/g, 'Tomorrow at 2:00 PM')
      .replace(/\{\{amount\}\}/g, '$150.00');
    
    setMessagePreview(immediatePreview);
    
    // Set new timeout for full preview with real data
    previewTimeoutRef.current = setTimeout(() => {
      generatePreview(message);
    }, 500); // 500ms delay for full preview
  };

  // Generate preview with real customer data
  const generatePreview = async (message) => {
    try {
      // Get real customer data for preview
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      const response = await fetch('/api/customers/preview-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: effectiveBusinessId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const previewData = data.preview_data;
        
        const preview = message
          .replace(/\{\{customer\.name\}\}/g, previewData.customer_name)
          .replace(/\{\{review_link\}\}/g, previewData.review_link)
          .replace(/\{\{business\.name\}\}/g, previewData.business_name)
          .replace(/\{\{service_date\}\}/g, previewData.service_date)
          .replace(/\{\{amount\}\}/g, previewData.amount);
        setMessagePreview(preview);
      } else {
        // Fallback to sample data
        const preview = message
          .replace(/\{\{customer\.name\}\}/g, 'John Smith')
          .replace(/\{\{review_link\}\}/g, 'https://reviews.example.com/review/abc123')
          .replace(/\{\{business\.name\}\}/g, 'Your Business Name')
          .replace(/\{\{service_date\}\}/g, 'January 15, 2024')
          .replace(/\{\{amount\}\}/g, '$150.00');
        setMessagePreview(preview);
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      // Fallback to sample data
      const preview = message
        .replace(/\{\{customer\.name\}\}/g, 'John Smith')
        .replace(/\{\{review_link\}\}/g, 'https://reviews.example.com/review/abc123')
        .replace(/\{\{business\.name\}\}/g, 'Your Business Name')
        .replace(/\{\{service_date\}\}/g, 'January 15, 2024')
        .replace(/\{\{amount\}\}/g, '$150.00');
      setMessagePreview(preview);
    }
  };

  // AI message generation
  const generateWithAI = async () => {
    try {
      setAiGenerating(true);
      
      // Use a fallback business ID if none is available
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      const requestBody = {
        template_name: template?.name,
        template_type: template?.key,
        business_id: effectiveBusinessId,
        automation_type: template?.trigger_type
      };
      
      console.log('🤖 AI Generation Request:', requestBody);
      
      // Skip health check and go straight to AI request
      console.log('🤖 Attempting AI generation...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI request timed out after 15 seconds');
      }, 15000); // 15 second timeout
      
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
        const newMessage = data.message;
        setCustomMessage(newMessage);
        setFormData(prev => ({
          ...prev,
          config_json: { ...prev.config_json, message: newMessage }
        }));
        generatePreview(newMessage);
        
        // Mark as AI generated
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
      console.error('AI generation error:', error);
      
      // Generate unique fallback messages when AI fails
      const fallbackMessages = {
        'job_completed': [
          'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
          'We appreciate your business! If you enjoyed our service, please share your experience with a review at {{review_link}}.',
          'Thank you for trusting us with your project! We\'d love to hear your feedback at {{review_link}}.',
          'Your satisfaction means everything to us! Please consider leaving a review at {{review_link}}.',
          'Thank you for your business! We hope you\'ll share your experience with others at {{review_link}}.'
        ],
        'invoice_paid': [
          'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
          'Payment received with gratitude! We\'d love your feedback at {{review_link}}.',
          'Thank you for the prompt payment! Please share your experience at {{review_link}}.',
          'We appreciate your business! Your review at {{review_link}} would mean the world to us.',
          'Payment confirmed! Thank you for choosing us. Please leave a review at {{review_link}}.'
        ],
        'service_reminder': [
          'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          'Hello {{customer.name}}! Just a quick reminder about your upcoming appointment. We can\'t wait to see you!',
          'Hi there {{customer.name}}! We\'re excited about your upcoming service. See you soon!',
          'Hello {{customer.name}}! A friendly reminder that we have your service appointment coming up. Looking forward to it!',
          'Hi {{customer.name}}! We\'re preparing for your upcoming appointment and can\'t wait to serve you!'
        ]
      };
      
      const messageArray = fallbackMessages[template?.key] || ['Thank you for your business! Please leave us a review at {{review_link}}.'];
      const randomIndex = Math.floor(Math.random() * messageArray.length);
      const fallbackMessage = messageArray[randomIndex];
      
      setCustomMessage(fallbackMessage);
      generatePreview(fallbackMessage);
      
      if (error.name === 'AbortError') {
        setNotification({
          type: 'info',
          message: 'AI generation timed out, but we\'ve added a professional fallback message for you!',
          duration: 5000
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'AI service is temporarily unavailable, but we\'ve added a professional fallback message for you!',
          duration: 5000
        });
      }
      setAiGenerating(false);
      setAiEnhancing(false);
    }
  };

  // AI message enhancement
  const enhanceMessage = async () => {
    try {
      setAiEnhancing(true);
      
      // Use a fallback business ID if none is available
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      // Skip health check and go straight to AI request
      console.log('🤖 Attempting AI enhancement...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI enhancement request timed out after 15 seconds');
      }, 15000); // 15 second timeout
      
      const response = await fetch('/api/ai/enhance-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_message: customMessage,
          template_name: template?.name,
          template_type: template?.key,
          business_id: effectiveBusinessId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const enhancedMessage = data.enhanced_message;
        setCustomMessage(enhancedMessage);
        setFormData(prev => ({
          ...prev,
          config_json: { ...prev.config_json, message: enhancedMessage }
        }));
        generatePreview(enhancedMessage);
        
        // Mark as AI enhanced
        setAiGenerating(false);
        setAiEnhancing(false);
      } else {
        const errorText = await response.text();
        console.error('AI Enhancement API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`AI enhancement failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      
      // Provide a simple enhancement when AI fails
      const currentText = customMessage;
      let enhancedText = currentText;
      
      // Simple enhancement rules
      if (currentText && !currentText.includes('{{customer.name}}')) {
        enhancedText = `{{customer.name}}, ${currentText}`;
      }
      
      if (enhancedText !== currentText) {
        setCustomMessage(enhancedText);
        generatePreview(enhancedText);
        setNotification({
          type: 'info',
          message: 'AI enhancement is unavailable, but we\'ve made some basic improvements to your message!',
          duration: 5000
        });
      } else {
        setNotification({
          type: 'info',
          message: 'AI enhancement is temporarily unavailable, but your original message is preserved.',
          duration: 5000
        });
      }
      
      setAiGenerating(false);
      setAiEnhancing(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Always save to database for persistence
      const updatedTemplate = {
        ...template,
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        channels: formData.channels,
        config_json: {
          ...template.config_json,
          ...formData.config_json
        },
        custom_message: filterSwearWords(customMessage),
        ai_generated: aiGenerating || aiEnhancing,
        message_variables: {
          customer_name: customMessage.includes('{{customer.name}}'),
          review_link: customMessage.includes('{{review_link}}'),
          business_name: customMessage.includes('{{business.name}}'),
          service_date: customMessage.includes('{{service_date}}'),
          amount: customMessage.includes('{{amount}}')
        },
        updated_at: new Date().toISOString()
      };

      // Try to save to database first (only if we have a valid businessId)
      if (businessId && businessId !== 'null' && businessId !== 'undefined') {
        try {
          const response = await fetch(`/api/templates/${businessId}/${template.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              ...formData,
              custom_message: filterSwearWords(customMessage),
              message_subject: formData.config_json?.subject || '',
              ai_generated: aiGenerating || aiEnhancing,
              message_variables: {
                customer_name: customMessage.includes('{{customer.name}}'),
                review_link: customMessage.includes('{{review_link}}'),
                business_name: customMessage.includes('{{business.name}}'),
                service_date: customMessage.includes('{{service_date}}'),
                amount: customMessage.includes('{{amount}}')
              }
            })
          });

          if (response.ok) {
            const dbTemplate = await response.json();
            onSave(dbTemplate);
            onClose();
            return; // Exit early if database save successful
          } else {
            throw new Error('Database save failed');
          }
        } catch (dbError) {
          console.log('Database save failed, saving to localStorage as backup:', dbError);
          // Fall through to localStorage save
        }
      }
      
      
      // BULLETPROOF PERSISTENCE SYSTEM
      const userEmail = user?.email || 'unknown';
      const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      try {
        // Get existing templates
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        
        // Create template data
        const templateData = {
          ...updatedTemplate,
          id: template.id,
          business_id: `mock-business-${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          user_email: userEmail,
          last_saved: new Date().toISOString()
        };
        
        // Save template
        savedTemplates[template.id] = templateData;
        
        // Save to localStorage
        localStorage.setItem(localStorageKey, JSON.stringify(savedTemplates));
        
        // Verify save worked
        const verifyData = localStorage.getItem(localStorageKey);
        const verifyTemplates = verifyData ? JSON.parse(verifyData) : {};
        
        console.log('🔒 BULLETPROOF SAVE COMPLETE:', {
          userEmail,
          localStorageKey,
          templateId: template.id,
          templateName: updatedTemplate.name,
          saved: verifyTemplates[template.id] ? 'SUCCESS' : 'FAILED',
          allTemplates: Object.keys(verifyTemplates),
          timestamp: new Date().toISOString()
        });
        
        // Double-check: if save failed, try alternative method
        if (!verifyTemplates[template.id]) {
          console.error('❌ SAVE FAILED - Trying alternative method');
          
          // Alternative: save to sessionStorage as backup
          const sessionKey = `session_${localStorageKey}`;
          sessionStorage.setItem(sessionKey, JSON.stringify(templateData));
          
          console.log('🔄 FALLBACK SAVE to sessionStorage:', sessionKey);
        }
        
      } catch (error) {
        console.error('❌ localStorage error:', error);
        
        // Fallback: save to sessionStorage
        const sessionKey = `session_blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${template.id}`;
        sessionStorage.setItem(sessionKey, JSON.stringify({
          ...updatedTemplate,
          id: template.id,
          user_email: userEmail,
          last_saved: new Date().toISOString()
        }));
        
        console.log('🔄 FALLBACK SAVE to sessionStorage:', sessionKey);
      }
      
      onSave(updatedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      setNotification({
        type: 'error',
        message: 'Error saving template. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const addChannel = (channel) => {
    if (!formData.channels.includes(channel)) {
      setFormData(prev => ({
        ...prev,
        channels: [...prev.channels, channel]
      }));
    }
  };

  const removeChannel = (channel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.filter(c => c !== channel)
    }));
  };

  const getSmartRecommendations = (templateKey) => {
    const recommendations = {
      'job_completed': {
        timing: '24 hours after job completion',
        message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
        channels: ['email', 'sms']
      },
      'invoice_paid': {
        timing: '48 hours after payment',
        message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
        channels: ['email']
      },
      'service_reminder': {
        timing: '1 day before service',
        message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
        channels: ['sms', 'email']
      }
    };
    return recommendations[templateKey] || {};
  };

  const recommendations = getSmartRecommendations(template?.key);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize Template: {template?.name}
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
            <div className="flex items-center justify-between">
              <span className="text-sm">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter template name"
                />
              </div>
              
              <div>
                <Label htmlFor="trigger">Trigger Type</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event-based (Job Complete, Payment, etc.)</SelectItem>
                    <SelectItem value="date_based">Date-based (Scheduled reminders)</SelectItem>
                    <SelectItem value="manual">Manual trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template does"
                rows={2}
                maxLength={150}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/150 characters
              </p>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Communication Channels</h3>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant={formData.channels.includes('email') ? 'default' : 'outline'}
                size="sm"
                onClick={() => formData.channels.includes('email') ? removeChannel('email') : addChannel('email')}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              
              <Button
                type="button"
                variant={formData.channels.includes('sms') ? 'default' : 'outline'}
                size="sm"
                onClick={() => formData.channels.includes('sms') ? removeChannel('sms') : addChannel('sms')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                SMS
                <Badge variant="secondary" className="ml-1 text-xs">Coming Soon</Badge>
              </Button>
            </div>
          </div>

          {/* Timing Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Timing Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delay_days">Delay (Days)</Label>
                <Input
                  id="delay_days"
                  type="number"
                  value={formData.config_json.delay_days}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config_json: {
                      ...prev.config_json,
                      delay_days: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="0"
                  max="30"
                />
              </div>
              
              <div>
                <Label htmlFor="delay_hours">Delay (Hours)</Label>
                <Input
                  id="delay_hours"
                  type="number"
                  value={formData.config_json.delay_hours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config_json: {
                      ...prev.config_json,
                      delay_hours: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="0"
                  max="168"
                />
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Message Content</h3>
            
            <div>
              <Label htmlFor="message">Email/SMS Message</Label>
              <Textarea
                ref={textareaRef}
                id="message"
                value={customMessage}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setCustomMessage(newValue);
                  generatePreviewDebounced(newValue);
                }}
                placeholder="Enter your message content. Use {{customer.name}} for personalization."
                rows={4}
              />
            </div>
            
            {/* Message Customization Dropdown */}
            <Collapsible open={messageDropdownOpen} onOpenChange={setMessageDropdownOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Customize Message Content
                  </span>
                  {messageDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Variable Insertion Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Insert Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: '{{customer.name}}', label: 'Customer Name', icon: User },
                      { key: '{{review_link}}', label: 'Review Link', icon: Link },
                      { key: '{{business.name}}', label: 'Business Name', icon: Building },
                      { key: '{{service_date}}', label: 'Service Date', icon: Calendar },
                      { key: '{{amount}}', label: 'Amount', icon: Star }
                    ].map((variable) => (
                      <Button
                        key={variable.key}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable.key)}
                        className="flex items-center gap-2"
                      >
                        <variable.icon className="w-3 h-3" />
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Actions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">AI Assistance</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={generateWithAI}
                      disabled={aiGenerating || aiEnhancing}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {aiGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={enhanceMessage}
                      disabled={aiGenerating || aiEnhancing || !customMessage.trim()}
                      className="flex items-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      {aiEnhancing ? 'Enhancing...' : 'Enhance Message'}
                    </Button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </Label>
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <div className="text-sm whitespace-pre-wrap">
                      {messagePreview || customMessage || 'Enter a message to see preview...'}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Visual Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Flow Preview</h3>
            
            <div className="flex items-center gap-2 flex-wrap p-4 bg-gray-50 rounded-lg">
              {/* Trigger */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Trigger</span>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              {/* Delay */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  {formData.config_json.delay_days > 0 ? `${formData.config_json.delay_days}d` : 
                   formData.config_json.delay_hours > 0 ? `${formData.config_json.delay_hours}h` : '0h'}
                </span>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              {/* Channels */}
              {formData.channels.map((channel, index) => (
                <React.Fragment key={channel}>
                  {index > 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
                    channel === 'sms' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
                  }`}>
                    {channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {channel === 'sms' ? 'SMS' : 'Email'}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>


          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
