import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Mail, MessageSquare, Clock, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";

export default function SequenceCreator({ isOpen, onClose, onSequenceCreated, businessId }) {
  const [sequenceData, setSequenceData] = useState({
    name: '',
    description: '',
    trigger_type: 'event',
    trigger_event: 'job_completed',
    steps: [
      {
        id: 1,
        channel: 'email',
        delay: 24,
        delayUnit: 'hours',
        message: 'Thank you for your business! We would appreciate a review.',
        subject: 'Thank you for your business!'
      }
    ]
  });

  const triggerEvents = [
    { value: 'job_completed', label: 'Job Completed', description: 'Triggered when a job/service is marked complete' },
    { value: 'invoice_paid', label: 'Invoice Paid', description: 'Triggered when payment is received' },
    { value: 'service_completed', label: 'Service Completed', description: 'Triggered when a service appointment ends' },
    { value: 'customer_created', label: 'New Customer', description: 'Triggered when a new customer is added' }
  ];

  const addStep = () => {
    const newStep = {
      id: Date.now(),
      channel: 'email',
      delay: 24,
      delayUnit: 'hours',
      message: 'Thank you for your business!',
      subject: 'Thank you for your business!'
    };
    setSequenceData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (stepId) => {
    if (sequenceData.steps.length > 1) {
      setSequenceData(prev => ({
        ...prev,
        steps: prev.steps.filter(step => step.id !== stepId)
      }));
    }
  };

  const updateStep = (stepId, field, value) => {
    setSequenceData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleCreate = async () => {
    try {
      const channels = sequenceData.steps.map(step => step.channel);
      const configJson = {
        message: sequenceData.description,
        trigger_event: sequenceData.trigger_event,
        delay_hours: sequenceData.steps.length > 1 ? sequenceData.steps[1].delay : 24,
        steps: sequenceData.steps
      };

      // Create the sequence via API
      const response = await fetch(`/api/templates/${businessId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: sequenceData.name,
          description: sequenceData.description,
          channels: channels,
          trigger_type: sequenceData.trigger_type,
          key: sequenceData.trigger_event,
          config_json: configJson
        })
      });

      if (response.ok) {
        onSequenceCreated();
      }

      // Reset form
      setSequenceData({
        name: '',
        description: '',
        trigger_type: 'event',
        trigger_event: 'job_completed',
        steps: [{
          id: 1,
          channel: 'email',
          delay: 24,
          delayUnit: 'hours',
          message: 'Thank you for your business!',
          subject: 'Thank you for your business!'
        }]
      });
      onClose();
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Error creating sequence');
    }
  };

  const getChannelIcon = (channel) => {
    return channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const getChannelColor = (channel) => {
    return channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                value={sequenceData.name}
                onChange={(e) => setSequenceData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Post-Visit Review Request"
              />
            </div>
            <div>
              <Label htmlFor="trigger_event">Trigger Event</Label>
              <Select 
                value={sequenceData.trigger_event} 
                onValueChange={(value) => setSequenceData(prev => ({ ...prev, trigger_event: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerEvents.map(event => (
                    <SelectItem key={event.value} value={event.value}>
                      <div>
                        <div className="font-medium">{event.label}</div>
                        <div className="text-xs text-slate-500">{event.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Sequence Description</Label>
            <Textarea
              id="description"
              value={sequenceData.description}
              onChange={(e) => setSequenceData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this automation sequence does..."
              rows={3}
            />
          </div>

          {/* Visual Flow Preview */}
          <div>
            <Label className="text-base font-semibold">Sequence Flow Preview</Label>
            <Card className="mt-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Trigger</span>
                  </div>
                  
                  {sequenceData.steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      
                      {index > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {step.delay}{step.delayUnit === 'hours' ? 'h' : step.delayUnit === 'days' ? 'd' : 'm'}
                          </span>
                        </div>
                      )}
                      
                      {index > 0 && <ArrowRight className="w-4 h-4 text-slate-400" />}
                      
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getChannelColor(step.channel)}`}>
                        {getChannelIcon(step.channel)}
                        <span className="text-sm font-medium">
                          {step.channel === 'sms' ? 'SMS' : 'Email'}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
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
              {sequenceData.steps.map((step, index) => (
                <div key={step.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Step {index + 1}</span>
                    {sequenceData.steps.length > 1 && (
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

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                          <SelectItem value="sms" disabled>
                            <div className="flex items-center gap-2 opacity-50">
                              <MessageSquare className="w-4 h-4" />
                              SMS
                              <Badge variant="outline" className="ml-2 text-xs">
                                Coming Soon
                              </Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {step.channel === 'sms' && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <AlertCircle className="w-4 h-4" />
                            <span>SMS functionality coming soon! Using Email for now.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Delay</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={step.delay}
                          onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value) || 0)}
                          min="0"
                          className="flex-1"
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

                    {step.channel === 'email' && (
                      <div>
                        <Label>Subject</Label>
                        <Input
                          value={step.subject}
                          onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                          placeholder="Email subject..."
                        />
                      </div>
                    )}

                    <div>
                      <Label>Message</Label>
                      <Textarea
                        value={step.message}
                        onChange={(e) => updateStep(step.id, 'message', e.target.value)}
                        placeholder="Message content..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!sequenceData.name || !sequenceData.description}>
            Create Sequence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
