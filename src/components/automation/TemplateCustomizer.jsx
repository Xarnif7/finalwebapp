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
  businessId 
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
  const textareaRef = useRef(null);

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
      const currentMessage = template.config_json?.message || defaultMessage;
      
      setFormData({
        name: template.name || '',
        description: template.description || '',
        trigger_type: template.trigger_type || 'event',
        channels: template.channels || ['email'],
        config_json: {
          message: currentMessage,
          delay_hours: template.config_json?.delay_hours || 24,
          delay_days: template.config_json?.delay_days || 1,
          steps: template.config_json?.steps || []
        }
      });
      
      setCustomMessage(currentMessage);
      generatePreview(currentMessage);
    }
  }, [template]);

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
      
      // Check if API endpoint is available first
      try {
        const healthCheck = await fetch('/api/ai/generate-message', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000) // 3 second health check
        });
        if (!healthCheck.ok) {
          throw new Error('API endpoint not available');
        }
      } catch (healthError) {
        console.log('API health check failed, using fallback');
        // Use fallback message immediately
        const fallbackMessages = {
          'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
          'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
          'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
        };
        const fallbackMessage = fallbackMessages[template?.key] || 
          'Thank you for your business! Please leave us a review at {{review_link}}.';
        
        setCustomMessage(fallbackMessage);
        generatePreview(fallbackMessage);
        alert('AI service is currently unavailable, but we\'ve added a professional fallback message for you!');
        setAiGenerating(false);
        setAiEnhancing(false);
        return;
      }
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI request timed out after 10 seconds');
      }, 10000); // 10 second timeout
      
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
      if (error.name === 'AbortError') {
        // Use fallback message when timeout occurs
        const fallbackMessages = {
          'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
          'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
          'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
        };
        const fallbackMessage = fallbackMessages[template?.key] || 
          'Thank you for your business! Please leave us a review at {{review_link}}.';
        
        setCustomMessage(fallbackMessage);
        generatePreview(fallbackMessage);
        alert('AI generation timed out, but we\'ve added a professional fallback message for you!');
      } else {
        alert('AI generation failed. Please try again.');
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
      
      // Check if API endpoint is available first
      try {
        const healthCheck = await fetch('/api/ai/enhance-message', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000) // 3 second health check
        });
        if (!healthCheck.ok) {
          throw new Error('API endpoint not available');
        }
      } catch (healthError) {
        console.log('Enhance API health check failed, keeping original message');
        alert('AI enhancement service is currently unavailable. Your original message is preserved.');
        setAiGenerating(false);
        setAiEnhancing(false);
        return;
      }
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI enhancement request timed out after 10 seconds');
      }, 10000); // 10 second timeout
      
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
      if (error.name === 'AbortError') {
        alert('AI enhancement timed out, but your original message is still there!');
      } else {
        alert('AI enhancement failed. Please try again.');
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
        custom_message: customMessage,
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

      // Try to save to database first
      try {
        const response = await fetch(`/api/templates/${businessId}/${template.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const dbTemplate = await response.json();
          onSave(dbTemplate);
        } else {
          throw new Error('Database save failed');
        }
      } catch (dbError) {
        console.log('Database save failed, saving to localStorage as backup:', dbError);
        // Fallback to localStorage for persistence
        const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
        savedTemplates[template.id] = updatedTemplate;
        localStorage.setItem('customTemplates', JSON.stringify(savedTemplates));
        
        onSave(updatedTemplate);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
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

        <div className="space-y-6">
          {/* Smart Recommendations */}
          {recommendations.timing && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Smart Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Optimal Timing:</strong> {recommendations.timing}</p>
                  <p><strong>Recommended Channels:</strong> {recommendations.channels.join(', ')}</p>
                </div>
              </CardContent>
            </Card>
          )}

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
              />
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
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Message Content</h3>
            
            <div>
              <Label htmlFor="message">Email/SMS Message</Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your message content. Use {{customer.name}} for personalization."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{{customer.name}}'}, {'{{business.name}}'}, {'{{service_type}}'}
              </p>
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
