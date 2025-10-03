import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Webhook,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useSequencesData } from '@/hooks/useSequencesData';
import { useZapierStatus } from '@/hooks/useZapierStatus';

const AutomationWizard = ({ isOpen, onClose, onSequenceCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { createSequence } = useSequencesData();
  const { isZapierConnected } = useZapierStatus();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'manual',
    triggerEvent: '',
    steps: [
      { id: 1, type: 'send_email', config: { template: '', delay: 0 } }
    ],
    settings: {
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      stopIfReview: true,
      rateLimit: 100,
      allowManualEnroll: true
    }
  });

  const [errors, setErrors] = useState({});

  const stepTypes = [
    { id: 'send_email', label: 'Send Email', icon: Mail, description: 'Send an email message' },
    { id: 'wait', label: 'Wait', icon: Clock, description: 'Wait for a specified time' },
    { id: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send an SMS message' }
  ];

  const triggerTypes = [
    { id: 'manual', label: 'Manual Enrollment', icon: User, description: 'Add customers manually' },
    { id: 'zapier', label: 'Zapier Event', icon: Zap, description: 'Triggered by Zapier webhook' },
    { id: 'webhook', label: 'Webhook', icon: Webhook, description: 'Custom webhook trigger' }
  ];

  const zapierEvents = [
    { id: 'job_completed', label: 'Job Completed' },
    { id: 'invoice_paid', label: 'Invoice Paid' },
    { id: 'service_scheduled', label: 'Service Scheduled' },
    { id: 'customer_created', label: 'Customer Created' }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'manual',
      triggerEvent: '',
      steps: [
        { id: 1, type: 'send_email', config: { template: '', delay: 0 } }
      ],
      settings: {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        stopIfReview: true,
        rateLimit: 100,
        allowManualEnroll: true
      }
    });
    setCurrentStep(1);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const updateStep = (stepId, field, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, [field]: value }
          : step
      )
    }));
  };

  const updateStepConfig = (stepId, configField, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              config: { 
                ...step.config, 
                [configField]: value 
              } 
            }
          : step
      )
    }));
  };

  const addStep = () => {
    const newId = Math.max(...formData.steps.map(s => s.id)) + 1;
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        { id: newId, type: 'send_email', config: { template: '', delay: 0 } }
      ]
    }));
  };

  const removeStep = (stepId) => {
    if (formData.steps.length > 1) {
      setFormData(prev => ({
        ...prev,
        steps: prev.steps.filter(step => step.id !== stepId)
      }));
    }
  };

  const moveStep = (stepId, direction) => {
    const steps = [...formData.steps];
    const index = steps.findIndex(s => s.id === stepId);
    
    if (direction === 'up' && index > 0) {
      [steps[index], steps[index - 1]] = [steps[index - 1], steps[index]];
    } else if (direction === 'down' && index < steps.length - 1) {
      [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
    }
    
    setFormData(prev => ({ ...prev, steps }));
  };

  const validateStep = (step) => {
    if (step.type === 'wait') {
      return step.config.delay > 0;
    }
    return step.config.template && step.config.template.trim() !== '';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Sequence name is required';
    }

    if (formData.triggerType === 'zapier' && !formData.triggerEvent) {
      newErrors.triggerEvent = 'Please select a Zapier event';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

    const invalidSteps = formData.steps.filter(step => !validateStep(step));
    if (invalidSteps.length > 0) {
      newErrors.steps = 'All steps must be properly configured';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before creating the sequence",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const sequenceData = {
        name: formData.name,
        description: formData.description,
        trigger_type: formData.triggerType,
        trigger_event_type: formData.triggerEvent || null,
        allow_manual_enroll: formData.settings.allowManualEnroll,
        quiet_hours_start: formData.settings.quietHoursStart,
        quiet_hours_end: formData.settings.quietHoursEnd,
        rate_limit: formData.settings.rateLimit,
        status: 'active',
        steps: formData.steps.map((step, index) => ({
          step_order: index + 1,
          step_type: step.type,
          step_config: step.config
        }))
      };

      const result = await createSequence(sequenceData);
      
      toast({
        title: "Success!",
        description: `Sequence "${formData.name}" created and activated`,
        variant: "default"
      });

      if (onSequenceCreated) {
        onSequenceCreated(result);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast({
        title: "Error",
        description: "Failed to create sequence. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Sequence Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="e.g., Job Completed Follow-up"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Brief description of what this sequence does"
          rows={3}
        />
      </div>

      <div>
        <Label>Trigger Type *</Label>
        <div className="grid grid-cols-1 gap-3 mt-2">
          {triggerTypes.map((trigger) => {
            const Icon = trigger.icon;
            const isSelected = formData.triggerType === trigger.id;
            const isDisabled = trigger.id === 'zapier' && !isZapierConnected;
            
            return (
              <button
                key={trigger.id}
                onClick={() => !isDisabled && updateFormData('triggerType', trigger.id)}
                disabled={isDisabled}
                className={`p-4 border rounded-lg text-left transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">{trigger.label}</div>
                    <div className="text-sm text-gray-500">{trigger.description}</div>
                    {isDisabled && (
                      <div className="text-xs text-amber-600 mt-1">Connect Zapier first</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {formData.triggerType === 'zapier' && (
        <div>
          <Label htmlFor="triggerEvent">Zapier Event *</Label>
          <Select
            value={formData.triggerEvent}
            onValueChange={(value) => updateFormData('triggerEvent', value)}
          >
            <SelectTrigger className={errors.triggerEvent ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {zapierEvents.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.triggerEvent && (
            <p className="text-sm text-red-500 mt-1">{errors.triggerEvent}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Sequence Steps</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Step</span>
          </Button>
        </div>
        
        {/* Flow Visualization */}
        {formData.steps.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="text-sm font-medium mb-2">Flow Preview:</h4>
            <div className="flex items-center space-x-2 flex-wrap">
              {formData.steps.map((step, index) => {
                const stepType = stepTypes.find(type => type.id === step.type);
                const Icon = stepType?.icon;
                return (
                  <React.Fragment key={step.id}>
                    {index > 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                    <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded border">
                      <Icon className="w-3 h-3" />
                      <span className="text-xs">
                        {step.type === 'wait' 
                          ? `${step.config.delay}${step.config.delayUnit || 'h'}`
                          : stepType?.label
                        }
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Common Patterns */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="text-sm font-medium mb-2">💡 Common Patterns:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>📧 <strong>Email → Wait 5h → SMS</strong> - Gentle follow-up</div>
            <div>📱 <strong>SMS → Wait 24h → Email</strong> - Immediate then detailed</div>
            <div>⏰ <strong>Wait 1h → Email</strong> - Delayed initial contact</div>
            <div>🔄 <strong>Email → Wait 3d → SMS</strong> - Multi-touch campaign</div>
          </div>
        </div>
      </div>

      {errors.steps && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errors.steps}</p>
        </div>
      )}

      <div className="space-y-4">
        {formData.steps.map((step, index) => {
          const stepType = stepTypes.find(t => t.id === step.type);
          const Icon = stepType?.icon || Mail;
          const isValid = validateStep(step);

          return (
            <Card key={step.id} className={`${!isValid ? 'border-red-200 bg-red-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">Step {index + 1}</span>
                      <Badge variant="outline">{stepType?.label}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, 'up')}
                      >
                        ↑
                      </Button>
                    )}
                    {index < formData.steps.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStep(step.id, 'down')}
                      >
                        ↓
                      </Button>
                    )}
                    {formData.steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Step Type</Label>
                    <Select
                      value={step.type}
                      onValueChange={(value) => updateStep(step.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stepTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center space-x-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {step.type === 'wait' ? (
                    <div className="space-y-2">
                      <Label>Wait Duration</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={step.config.delay}
                          onChange={(e) => updateStepConfig(step.id, 'delay', parseFloat(e.target.value) || 0)}
                          placeholder="5"
                          className="w-20"
                        />
                        <Select
                          value={step.config.delayUnit || 'hours'}
                          onValueChange={(value) => updateStepConfig(step.id, 'delayUnit', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-gray-500">
                        Common: 1 hour, 5 hours, 24 hours, 3 days
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Template/Message</Label>
                      <Input
                        value={step.config.template}
                        onChange={(e) => updateStepConfig(step.id, 'template', e.target.value)}
                        placeholder="Template name or message content"
                      />
                      {step.type === 'send_sms' && (
                        <p className="text-xs text-blue-600">
                          💡 SMS messages should be under 160 characters
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!isValid && (
                  <div className="mt-2 flex items-center space-x-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {step.type === 'wait' 
                        ? 'Wait duration must be greater than 0'
                        : 'Template/message is required'
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Settings</h3>
        
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium">Quiet Hours</Label>
            <p className="text-sm text-gray-600 mb-3">Messages won't be sent during these hours</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quietStart">Start Time</Label>
                <Input
                  id="quietStart"
                  type="time"
                  value={formData.settings.quietHoursStart}
                  onChange={(e) => updateFormData('settings', {
                    ...formData.settings,
                    quietHoursStart: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="quietEnd">End Time</Label>
                <Input
                  id="quietEnd"
                  type="time"
                  value={formData.settings.quietHoursEnd}
                  onChange={(e) => updateFormData('settings', {
                    ...formData.settings,
                    quietHoursEnd: e.target.value
                  })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Stop if Review Left</Label>
                <p className="text-sm text-gray-600">Stop sequence if customer leaves a review</p>
              </div>
              <Switch
                checked={formData.settings.stopIfReview}
                onCheckedChange={(checked) => updateFormData('settings', {
                  ...formData.settings,
                  stopIfReview: checked
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Allow Manual Enrollment</Label>
                <p className="text-sm text-gray-600">Allow manually adding customers to this sequence</p>
              </div>
              <Switch
                checked={formData.settings.allowManualEnroll}
                onCheckedChange={(checked) => updateFormData('settings', {
                  ...formData.settings,
                  allowManualEnroll: checked
                })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rateLimit">Daily Rate Limit</Label>
            <p className="text-sm text-gray-600 mb-2">Maximum messages to send per day</p>
            <Input
              id="rateLimit"
              type="number"
              min="1"
              value={formData.settings.rateLimit}
              onChange={(e) => updateFormData('settings', {
                ...formData.settings,
                rateLimit: parseInt(e.target.value) || 100
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Review & Activate</h3>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>{formData.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Trigger</Label>
              <p className="text-sm">
                {triggerTypes.find(t => t.id === formData.triggerType)?.label}
                {formData.triggerEvent && ` - ${zapierEvents.find(e => e.id === formData.triggerEvent)?.label}`}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Steps ({formData.steps.length})</Label>
              <div className="space-y-2">
                {formData.steps.map((step, index) => {
                  const stepType = stepTypes.find(t => t.id === step.type);
                  return (
                    <div key={step.id} className="flex items-center space-x-2 text-sm">
                      <span className="w-6 text-gray-500">{index + 1}.</span>
                      <stepType.icon className="h-4 w-4" />
                      <span>{stepType.label}</span>
                      {step.type === 'wait' && (
                        <span className="text-gray-500">({step.config.delay}h)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Settings</Label>
              <div className="text-sm space-y-1">
                <p>Quiet hours: {formData.settings.quietHoursStart} - {formData.settings.quietHoursEnd}</p>
                <p>Rate limit: {formData.settings.rateLimit} messages/day</p>
                <p>Stop if review: {formData.settings.stopIfReview ? 'Yes' : 'No'}</p>
                <p>Manual enrollment: {formData.settings.allowManualEnroll ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Name and trigger' },
    { number: 2, title: 'Steps', description: 'Build your sequence' },
    { number: 3, title: 'Settings', description: 'Configure behavior' },
    { number: 4, title: 'Review', description: 'Activate sequence' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] h-[85vh] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Automation</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= step.number
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.number}
              </div>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9]"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create & Activate
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationWizard;
