import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Clock, Settings, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

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

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        trigger_type: template.trigger_type || 'event',
        channels: template.channels || ['email'],
        config_json: {
          message: template.config_json?.message || '',
          delay_hours: template.config_json?.delay_hours || 24,
          delay_days: template.config_json?.delay_days || 1,
          steps: template.config_json?.steps || []
        }
      });
    }
  }, [template]);

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
                value={formData.config_json.message}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config_json: {
                    ...prev.config_json,
                    message: e.target.value
                  }
                }))}
                placeholder="Enter your message content. Use {{customer.name}} for personalization."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{{customer.name}}'}, {'{{business.name}}'}, {'{{service_type}}'}
              </p>
            </div>
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
