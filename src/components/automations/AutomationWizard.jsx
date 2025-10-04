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
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useSequencesData } from '@/hooks/useSequencesData';
import { useZapierStatus } from '@/hooks/useZapierStatus';
import FlowBuilder from './FlowBuilder';
import AITimingOptimizer from './AITimingOptimizer';

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
  const [flowSteps, setFlowSteps] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState(['email']);
  const [aiTimingEnabled, setAiTimingEnabled] = useState(false);
  const [aiTimingData, setAiTimingData] = useState({});
  const [selectedQuickTemplate, setSelectedQuickTemplate] = useState(null);
  const [selectedCrm, setSelectedCrm] = useState('manual');
  const [selectedTriggers, setSelectedTriggers] = useState({});
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false);

  const stepTypes = [
    { id: 'send_email', label: 'Send Email', icon: Mail, description: 'Send email' },
    { id: 'wait', label: 'Wait', icon: Clock, description: 'Wait' },
    { id: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send SMS' }
  ];

  // CRM Options (matching the old style)
  const CRM_OPTIONS = {
    qbo: {
      name: 'QuickBooks Online',
      description: 'Connect to QuickBooks for invoice, payment, and customer events',
      icon: '📊',
      color: 'blue',
      available: true
    },
    jobber: {
      name: 'Jobber',
      description: 'Connect to Jobber for job completion and scheduling events',
      icon: '🔧',
      color: 'green',
      available: false // Coming soon
    },
    housecall_pro: {
      name: 'Housecall Pro',
      description: 'Connect to Housecall Pro for service completion events',
      icon: '🏠',
      color: 'purple',
      available: false // Coming soon
    },
    servicetitan: {
      name: 'ServiceTitan',
      description: 'Connect to ServiceTitan for job and customer events',
      icon: '⚡',
      color: 'orange',
      available: false // Coming soon
    },
    manual: {
      name: 'Manual Trigger',
      description: 'Trigger manually from the customer tab',
      icon: '👆',
      color: 'gray',
      available: true
    }
  };

  // QBO Triggers (simplified version)
  const QBO_TRIGGERS = {
    'invoice_created': {
      name: 'Invoice Created',
      description: 'When a new invoice is created in QuickBooks',
      category: 'Invoicing',
      icon: '📄'
    },
    'invoice_paid': {
      name: 'Invoice Paid',
      description: 'When a customer pays an invoice',
      category: 'Invoicing',
      icon: '💰'
    },
    'customer_created': {
      name: 'Customer Created',
      description: 'When a new customer is added to QuickBooks',
      category: 'Customers',
      icon: '👤'
    },
    'job_completed': {
      name: 'Job Completed',
      description: 'When a job is marked as completed',
      category: 'Jobs',
      icon: '✅'
    }
  };

  // Manual triggers
  const MANUAL_TRIGGERS = {
    'manual_enrollment': {
      name: 'Manual Enrollment',
      description: 'Add customers manually to this sequence',
      category: 'Manual',
      icon: '👆'
    }
  };

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
    setSelectedCrm('manual');
    setSelectedTriggers({});
    setShowTriggerDropdown(false);
  };

  // Helper function to get available triggers for selected CRM
  const getAvailableTriggers = () => {
    switch (selectedCrm) {
      case 'qbo':
        return QBO_TRIGGERS;
      case 'manual':
        return MANUAL_TRIGGERS;
      default:
        return {};
    }
  };

  // Helper function to handle CRM selection
  const handleCrmChange = (crmId) => {
    setSelectedCrm(crmId);
    setSelectedTriggers({});
    setShowTriggerDropdown(false);
    
    // Update form data
    updateFormData('triggerType', crmId);
  };

  // Helper function to handle trigger selection
  const handleTriggerChange = (triggerId, checked) => {
    const newTriggers = { ...selectedTriggers };
    if (checked) {
      newTriggers[triggerId] = true;
    } else {
      delete newTriggers[triggerId];
    }
    setSelectedTriggers(newTriggers);
    
    // Update form data with the first selected trigger (for backward compatibility)
    const triggerIds = Object.keys(newTriggers);
    updateFormData('triggerEvent', triggerIds.length > 0 ? triggerIds[0] : '');
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

    if (selectedCrm && selectedCrm !== 'manual' && Object.keys(selectedTriggers).length === 0) {
      newErrors.triggers = 'Please select at least one trigger event';
    }

    if (selectedChannels.length === 0) {
      newErrors.channels = 'Please select at least one communication channel';
    }

    if (flowSteps.length === 0) {
      newErrors.flow = 'Please create at least one step in your flow';
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
    if (currentStep < 6) {
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
        trigger_type: selectedCrm,
        trigger_event_type: Object.keys(selectedTriggers).length > 0 ? Object.keys(selectedTriggers)[0] : null,
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

  // Quick-start templates for common automation patterns
  const quickTemplates = [
    {
      id: 'simple_email',
      name: 'Simple Email Follow-up',
      description: 'Send a thank you email 24 hours after review request',
      steps: [
        { type: 'send_email', config: { template: 'Thank you email' } },
        { type: 'wait', config: { delay: 24, delayUnit: 'hours' } }
      ],
      channels: ['email']
    },
    {
      id: 'email_sms_sequence',
      name: 'Email + SMS Sequence',
      description: 'Send email immediately, then SMS follow-up after 5 hours',
      steps: [
        { type: 'send_email', config: { template: 'Thank you email' } },
        { type: 'wait', config: { delay: 5, delayUnit: 'hours' } },
        { type: 'send_sms', config: { template: 'SMS follow-up' } }
      ],
      channels: ['email', 'sms']
    },
    {
      id: 'sms_only',
      name: 'SMS Only Follow-up',
      description: 'Send SMS message 2 hours after review request',
      steps: [
        { type: 'send_sms', config: { template: 'Thank you SMS' } },
        { type: 'wait', config: { delay: 2, delayUnit: 'hours' } }
      ],
      channels: ['sms']
    },
    {
      id: 'multi_step',
      name: 'Multi-Step Campaign',
      description: 'Email → Wait 3h → SMS → Wait 1 day → Final email',
      steps: [
        { type: 'send_email', config: { template: 'Initial email' } },
        { type: 'wait', config: { delay: 3, delayUnit: 'hours' } },
        { type: 'send_sms', config: { template: 'SMS reminder' } },
        { type: 'wait', config: { delay: 1, delayUnit: 'days' } },
        { type: 'send_email', config: { template: 'Final follow-up' } }
      ],
      channels: ['email', 'sms']
    }
  ];

  const applyQuickTemplate = (template) => {
    setSelectedQuickTemplate(template);
    updateFormData('name', template.name);
    updateFormData('description', template.description);
    setSelectedChannels(template.channels);
    
    // Convert template steps to flowSteps format
    const convertedSteps = template.steps.map((step, index) => ({
      id: Date.now() + index,
      type: step.type,
      label: stepTypes.find(s => s.id === step.type)?.label || step.type,
      config: step.config
    }));
    
    setFlowSteps(convertedSteps);
    
    // Also update formData.steps to ensure the template is fully applied
    const formSteps = template.steps.map((step, index) => ({
      id: Date.now() + index + 1000, // Different ID range to avoid conflicts
      type: step.type,
      config: step.config
    }));
    
    setFormData(prev => ({
      ...prev,
      steps: formSteps
    }));
    
    toast({
      title: "Template Applied",
      description: `${template.name} has been loaded. You can customize it in the next steps.`
    });
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      <div className="mb-6">
        <Label className="text-base font-medium mb-3 block">Quick Start Templates</Label>
        <p className="text-sm text-gray-600 mb-4">Choose a template or create from scratch.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedQuickTemplate?.id === template.id 
                  ? 'ring-2 ring-purple-500 bg-purple-50' 
                  : 'hover:border-purple-300'
              }`}
              onClick={() => applyQuickTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {template.channels.length} channel{template.channels.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                
                {/* Visual flow preview */}
                <div className="flex items-center space-x-1 text-xs">
                  {template.steps.slice(0, 4).map((step, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                      <div className={`px-2 py-1 rounded text-white text-xs ${
                        step.type === 'send_email' ? 'bg-blue-500' :
                        step.type === 'send_sms' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}>
                        {step.type === 'send_email' ? 'Email' :
                         step.type === 'send_sms' ? 'SMS' :
                         step.type === 'wait' ? `${step.config.delay}${step.config.delayUnit.charAt(0)}` :
                         step.type}
                      </div>
                    </React.Fragment>
                  ))}
                  {template.steps.length > 4 && <span className="text-gray-400">...</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Or create from scratch */}
      <div className="border-t pt-6">
        <Label className="text-base font-medium mb-3 block">Or Create From Scratch</Label>
        <div className="space-y-4">
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
        </div>
      </div>

      {/* CRM Selection */}
      <div>
        <Label>Choose Your CRM System *</Label>
        <p className="text-sm text-gray-600 mb-4">Select which system will trigger this automation</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(CRM_OPTIONS).map(([key, crm]) => (
            <button
              key={key}
              onClick={() => !crm.available ? null : handleCrmChange(key)}
              disabled={!crm.available}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedCrm === key
                  ? `border-${crm.color}-500 bg-${crm.color}-50`
                  : crm.available
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
            >
              {selectedCrm === key && (
                <div className={`absolute top-2 right-2 w-5 h-5 bg-${crm.color}-500 rounded-full flex items-center justify-center`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{crm.icon}</div>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{crm.name}</h4>
                    {!crm.available && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{crm.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedCrm && CRM_OPTIONS[selectedCrm] && (
          <div className={`mt-4 p-3 rounded-md bg-${CRM_OPTIONS[selectedCrm].color}-50 border border-${CRM_OPTIONS[selectedCrm].color}-200`}>
            <div className="flex items-center space-x-2">
              <Building className={`w-4 h-4 text-${CRM_OPTIONS[selectedCrm].color}-600`} />
              <span className={`text-sm font-medium text-${CRM_OPTIONS[selectedCrm].color}-800`}>
                {CRM_OPTIONS[selectedCrm].name} Selected
              </span>
            </div>
            <p className={`text-xs text-${CRM_OPTIONS[selectedCrm].color}-700 mt-1`}>
              Next: Choose specific events that will trigger this automation
            </p>
          </div>
        )}
      </div>

      {/* Trigger Selection Dropdown */}
      {selectedCrm && selectedCrm !== 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Select Trigger Events *</Label>
            <button
              onClick={() => setShowTriggerDropdown(!showTriggerDropdown)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <span>Choose Events</span>
              {showTriggerDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {showTriggerDropdown && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="space-y-3">
                {Object.entries(getAvailableTriggers()).map(([triggerId, trigger]) => (
                  <div key={triggerId} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={triggerId}
                      checked={selectedTriggers[triggerId] || false}
                      onChange={(e) => handleTriggerChange(triggerId, e.target.checked)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <label htmlFor={triggerId} className="flex items-center space-x-2 cursor-pointer">
                        <span className="text-lg">{trigger.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{trigger.name}</div>
                          <div className="text-xs text-gray-600">{trigger.description}</div>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(selectedTriggers).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(selectedTriggers).map(triggerId => {
                const trigger = getAvailableTriggers()[triggerId];
                return (
                  <Badge key={triggerId} variant="secondary" className="text-xs">
                    {trigger.icon} {trigger.name}
                  </Badge>
                );
              })}
            </div>
          )}

          {errors.triggers && (
            <p className="text-sm text-red-500 mt-1">{errors.triggers}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Communication Channels</h3>
        <p className="text-gray-600 mb-4">
          Choose your communication methods.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedChannels.includes('email') 
              ? 'border-2 border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
              : 'border-2 border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            const newChannels = selectedChannels.includes('email')
              ? selectedChannels.filter(c => c !== 'email')
              : [...selectedChannels, 'email'];
            setSelectedChannels(newChannels);
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium">Email</h4>
                <p className="text-sm text-gray-600">Send professional emails with rich content</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            selectedChannels.includes('sms') 
              ? 'border-2 border-green-500 bg-green-50 ring-2 ring-green-200' 
              : 'border-2 border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            const newChannels = selectedChannels.includes('sms')
              ? selectedChannels.filter(c => c !== 'sms')
              : [...selectedChannels, 'sms'];
            setSelectedChannels(newChannels);
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <h4 className="font-medium">SMS</h4>
                <p className="text-sm text-gray-600">Send instant text messages (160 char limit)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedChannels.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Please select at least one communication channel to continue.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
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
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <h4 className="text-sm font-medium mb-2">💡 Common Patterns:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            <div>📧 <strong>Email → Wait 5h → SMS</strong></div>
            <div>📱 <strong>SMS → Wait 24h → Email</strong></div>
            <div>⏰ <strong>Wait 1h → Email</strong></div>
            <div>🔄 <strong>Email → Wait 3d → SMS</strong></div>
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
                      
                      {/* AI Timing Optimization */}
                      <div className="mt-4">
                        <AITimingOptimizer
                          isEnabled={aiTimingEnabled}
                          onToggle={(enabled) => {
                            setAiTimingEnabled(enabled);
                            if (!enabled) {
                              // Reset to manual timing if AI is disabled
                              updateStepConfig(step.id, 'delay', 1);
                              updateStepConfig(step.id, 'delayUnit', 'hours');
                            }
                          }}
                          channel={selectedChannels.includes('sms') ? 'sms' : 'email'}
                          onTimingChange={(timing) => {
                            if (timing.isAIOptimized) {
                              updateStepConfig(step.id, 'delay', timing.delay);
                              updateStepConfig(step.id, 'delayUnit', timing.unit);
                              setAiTimingData(prev => ({
                                ...prev,
                                [step.id]: timing
                              }));
                            }
                          }}
                        />
                      </div>
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


  const renderStep4 = () => {
    console.log('renderStep4 called with:', { selectedChannels, flowSteps });
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Visual Flow Builder</h3>
          <p className="text-gray-600 mb-4">
            Drag and drop to create your automation flow. Click on steps to set timing between them.
          </p>
          <p className="text-sm text-gray-500">
            Selected channels: {selectedChannels.join(', ') || 'None'}
          </p>
        </div>

        <FlowBuilder
          selectedChannels={selectedChannels}
          onFlowChange={setFlowSteps}
          initialFlow={flowSteps}
        />

        {flowSteps.length === 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Start by dragging a trigger, then add your communication steps. You can set timing between each step by clicking on them.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Settings</h3>
        <p className="text-gray-600 mb-4">
          Configure when and how your automation should run.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiet Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  value={formData.settings.quietHoursStart}
                  onChange={(e) => updateFormData('settings', {
                    ...formData.settings,
                    quietHoursStart: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  value={formData.settings.quietHoursEnd}
                  onChange={(e) => updateFormData('settings', {
                    ...formData.settings,
                    quietHoursEnd: e.target.value
                  })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Messages won't be sent during these hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate Limiting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Daily Limit</Label>
              <Input
                type="number"
                min="1"
                value={formData.settings.rateLimit}
                onChange={(e) => updateFormData('settings', {
                  ...formData.settings,
                  rateLimit: parseInt(e.target.value) || 100
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum messages per day
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Stop if review received</Label>
              <p className="text-sm text-gray-500">Pause automation if customer leaves a review</p>
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
              <Label className="text-base">Allow manual enrollment</Label>
              <p className="text-sm text-gray-500">Let you manually add customers to this automation</p>
            </div>
            <Switch
              checked={formData.settings.allowManualEnroll}
              onCheckedChange={(checked) => updateFormData('settings', {
                ...formData.settings,
                allowManualEnroll: checked
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep6 = () => (
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
    { number: 2, title: 'Channels', description: 'Select communication methods' },
    { number: 3, title: 'Steps', description: 'Build your sequence' },
    { number: 4, title: 'Flow Builder', description: 'Visual flow design' },
    { number: 5, title: 'Settings', description: 'Configure behavior' },
    { number: 6, title: 'Review', description: 'Activate sequence' }
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
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
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
            {currentStep < 6 ? (
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
