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
  Check,
  Brain,
  Info
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
      allowManualEnroll: true
    }
  });

  const [errors, setErrors] = useState({});
  const [flowSteps, setFlowSteps] = useState([]);

  // Always ensure we have a trigger as the first step when on Step 3
  useEffect(() => {
    if (currentStep === 3) {
      const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
      if (safeFlowSteps.length === 0 || safeFlowSteps[0].type !== 'trigger') {
        const triggerStep = {
          id: Date.now(),
          type: 'trigger',
          config: {}
        };
        setFlowSteps([triggerStep, ...safeFlowSteps.filter(step => step.type !== 'trigger')]);
      }
    }
  }, [currentStep, flowSteps]);
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

  // QBO Triggers (comprehensive version)
  const QBO_TRIGGERS = {
    // Invoicing Events
    'invoice_created': {
      name: 'Invoice Created',
      description: 'When a new invoice is created in QuickBooks',
      category: 'Invoicing',
      icon: '📄'
    },
    'invoice_sent': {
      name: 'Invoice Sent',
      description: 'When an invoice is sent to a customer',
      category: 'Invoicing',
      icon: '📤'
    },
    'invoice_paid': {
      name: 'Invoice Paid',
      description: 'When a customer pays an invoice',
      category: 'Invoicing',
      icon: '💰'
    },
    'invoice_overdue': {
      name: 'Invoice Overdue',
      description: 'When an invoice becomes overdue',
      category: 'Invoicing',
      icon: '⚠️'
    },
    'payment_received': {
      name: 'Payment Received',
      description: 'When any payment is received',
      category: 'Invoicing',
      icon: '💳'
    },
    
    // Customer Events
    'customer_created': {
      name: 'Customer Created',
      description: 'When a new customer is added to QuickBooks',
      category: 'Customers',
      icon: '👤'
    },
    'customer_updated': {
      name: 'Customer Updated',
      description: 'When customer information is modified',
      category: 'Customers',
      icon: '✏️'
    },
    
    // Job/Project Events
    'job_created': {
      name: 'Job Created',
      description: 'When a new job/project is created',
      category: 'Jobs',
      icon: '🔨'
    },
    'job_started': {
      name: 'Job Started',
      description: 'When a job is marked as started',
      category: 'Jobs',
      icon: '🚀'
    },
    'job_completed': {
      name: 'Job Completed',
      description: 'When a job is marked as completed',
      category: 'Jobs',
      icon: '✅'
    },
    'job_cancelled': {
      name: 'Job Cancelled',
      description: 'When a job is cancelled',
      category: 'Jobs',
      icon: '❌'
    },
    
    // Estimate Events
    'estimate_created': {
      name: 'Estimate Created',
      description: 'When a new estimate is created',
      category: 'Estimates',
      icon: '📋'
    },
    'estimate_sent': {
      name: 'Estimate Sent',
      description: 'When an estimate is sent to a customer',
      category: 'Estimates',
      icon: '📨'
    },
    'estimate_accepted': {
      name: 'Estimate Accepted',
      description: 'When a customer accepts an estimate',
      category: 'Estimates',
      icon: '👍'
    },
    'estimate_declined': {
      name: 'Estimate Declined',
      description: 'When a customer declines an estimate',
      category: 'Estimates',
      icon: '👎'
    },
    
    // Time Tracking Events
    'time_entry_created': {
      name: 'Time Entry Created',
      description: 'When time is logged for a job',
      category: 'Time Tracking',
      icon: '⏱️'
    },
    
    // Expense Events
    'expense_created': {
      name: 'Expense Created',
      description: 'When an expense is recorded',
      category: 'Expenses',
      icon: '💸'
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
    if (!step || !step.type) return false;
    
    if (step.type === 'wait') {
      return step.config && step.config.delay > 0;
    }
    if (step.type === 'send_email' || step.type === 'send_sms') {
      return step.config && step.config.template && step.config.template.trim() !== '';
    }
    if (step.type === 'trigger') {
      return true; // Trigger steps are always valid
    }
    return true; // Default to valid for other step types
  };

  const validateForm = () => {
    const newErrors = {};

    // Step 1: Basic Info validation
    if (currentStep >= 1) {
    if (!formData.name.trim()) {
      newErrors.name = 'Sequence name is required';
    }

      if (selectedCrm && selectedCrm !== 'manual' && Object.keys(selectedTriggers).length === 0) {
        newErrors.triggers = 'Please select at least one trigger event';
      }
    }

    // Step 2: Channels validation
    if (currentStep >= 2) {
    if (selectedChannels.length === 0) {
      newErrors.channels = 'Please select at least one communication channel';
      }
    }

    // Step 3: Flow validation
    if (currentStep >= 3) {
      const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
      if (safeFlowSteps.length === 0) {
        newErrors.flow = 'Please create at least one step in your flow';
      } else {
        // Check if we have at least one communication step (not just trigger)
        const communicationSteps = safeFlowSteps.filter(step => 
          step.type === 'email' || step.type === 'sms' || step.type === 'send_email' || step.type === 'send_sms'
        );
        if (communicationSteps.length === 0) {
          newErrors.flow = 'Please add at least one Email or SMS step to your flow';
        }
      }
    }

    // Step 4: Steps validation
    if (currentStep >= 4) {
      const safeSteps = Array.isArray(formData.steps) ? formData.steps : [];
      if (safeSteps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

      const invalidSteps = safeSteps.filter(step => !validateStep(step));
    if (invalidSteps.length > 0) {
      newErrors.steps = 'All steps must be properly configured';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (!validateForm()) {
      return;
    }
    
    // Sync flowSteps to formData.steps when moving from Step 3 to Step 4
    if (currentStep === 3) {
      const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
      if (safeFlowSteps.length > 0) {
        const convertedSteps = safeFlowSteps.map((step, index) => ({
          id: step.id || Date.now() + index,
          type: step.type === 'email' ? 'send_email' : step.type === 'sms' ? 'send_sms' : step.type || 'wait',
          config: {
            template: step.template || 'Thank you for your business!',
            delay: step.timing?.value || 0,
            delayUnit: step.timing?.unit || 'hours',
            ...step.config
          }
        }));
        setFormData(prev => ({
          ...prev,
          steps: convertedSteps
        }));
      } else {
        // Ensure we have at least one step
        setFormData(prev => ({
          ...prev,
          steps: [{
            id: Date.now(),
            type: 'send_email',
            config: {
              template: 'Thank you for your business!',
              delay: 0,
              delayUnit: 'hours'
            }
          }]
        }));
      }
    }
    
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
        status: 'active',
        steps: formData.steps.map((step, index) => ({
          kind: step.type === 'send_email' ? 'send_email' : 
                step.type === 'send_sms' ? 'send_sms' : 
                step.type === 'wait' ? 'wait' : 'branch',
          step_index: index + 1,
          wait_ms: step.type === 'wait' ? (step.config.delay || 1) * (step.config.delayUnit === 'hours' ? 3600000 : 60000) : null,
          template_id: (step.type === 'send_email' || step.type === 'send_sms') ? step.config.template_id : null,
          config: step.config
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

  const renderFlowBuilder = () => {
    // Ensure selectedChannels is always an array
    const safeSelectedChannels = Array.isArray(selectedChannels) ? selectedChannels : [];
    
    // Ensure flowSteps is always an array
    const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Build Your Automation Flow</h3>
          <p className="text-gray-600 mb-4">
            Drag and drop items to create your automation sequence. You can insert steps between existing ones or add them at the end.
          </p>
          
          {/* Helpful Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-2">💡 How to build your flow:</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• <strong>Start with a Trigger</strong> - This begins your automation</li>
                  <li>• <strong>Add communication steps</strong> - Email or SMS messages</li>
                  <li>• <strong>Set timing</strong> - Click on steps to add delays between messages</li>
                  <li>• <strong>Drag between steps</strong> - Drop items between existing steps to insert them</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                <strong>Selected channels:</strong> {selectedChannels.join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>

        <FlowBuilder
          selectedChannels={selectedChannels}
          onFlowChange={setFlowSteps}
          initialFlow={flowSteps}
        />

        {errors.flow && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.flow}</p>
          </div>
        )}
      </div>
    );
  };

  const renderStep4Old_DISABLED = () => {
    console.log('renderStep4 called with:', { selectedChannels, flowSteps });
    return (
      <div className="space-y-6">
        <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Available Components</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Trigger is now always first in the flow, not draggable */}

          {/* Email Component - Only if email channel selected */}
          {safeSelectedChannels.includes('email') && (
            <div 
              className="flex flex-col items-center p-4 bg-white border-2 border-blue-200 rounded-xl shadow-md hover:shadow-lg hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'send_email',
                  config: { template: 'Thank you email' }
                }));
                // Create a clean drag image without the huge gray box
                const dragImage = e.target.cloneNode(true);
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.left = '-1000px';
                dragImage.style.width = '120px';
                dragImage.style.height = 'auto';
                dragImage.style.opacity = '0.8';
                dragImage.style.pointerEvents = 'none';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 60, 30);
                setTimeout(() => document.body.removeChild(dragImage), 0);
              }}
              onClick={() => {
                const newStep = {
                  id: Date.now(),
                  type: 'send_email',
                  config: { template: 'Thank you email' }
                };
                setFlowSteps(prev => [...prev, newStep]);
                
                // Show success feedback
                toast({
                  title: "Step Added",
                  description: "Email step added to your automation flow",
                  variant: "default"
                });
              }}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Email</span>
              <span className="text-xs text-gray-500 text-center mt-1">Send email</span>
            </div>
          )}

          {/* SMS Component - Only if SMS channel selected */}
          {safeSelectedChannels.includes('sms') && (
            <div 
              className="flex flex-col items-center p-4 bg-white border-2 border-green-200 rounded-xl shadow-md hover:shadow-lg hover:border-green-300 transition-all cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'send_sms',
                  config: { template: 'Thank you SMS' }
                }));
                // Create a clean drag image without the huge gray box
                const dragImage = e.target.cloneNode(true);
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.left = '-1000px';
                dragImage.style.width = '120px';
                dragImage.style.height = 'auto';
                dragImage.style.opacity = '0.8';
                dragImage.style.pointerEvents = 'none';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 60, 30);
                setTimeout(() => document.body.removeChild(dragImage), 0);
              }}
              onClick={() => {
                const newStep = {
                  id: Date.now(),
                  type: 'send_sms',
                  config: { template: 'Thank you SMS' }
                };
                setFlowSteps(prev => [...prev, newStep]);
              }}
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">SMS</span>
              <span className="text-xs text-gray-500 text-center mt-1">Send text</span>
            </div>
          )}

          {/* Wait Component - Always Available */}
          <div 
            className="flex flex-col items-center p-4 bg-white border-2 border-orange-200 rounded-xl shadow-md hover:shadow-lg hover:border-orange-300 transition-all cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'wait',
                config: { delay: 1, delayUnit: 'hours' }
              }));
              // Create a clean drag image without the huge gray box
              const dragImage = e.target.cloneNode(true);
              dragImage.style.position = 'absolute';
              dragImage.style.top = '-1000px';
              dragImage.style.left = '-1000px';
              dragImage.style.width = '120px';
              dragImage.style.height = 'auto';
              dragImage.style.opacity = '0.8';
              dragImage.style.pointerEvents = 'none';
              document.body.appendChild(dragImage);
              e.dataTransfer.setDragImage(dragImage, 60, 30);
              setTimeout(() => document.body.removeChild(dragImage), 0);
            }}
            onClick={() => {
              const newStep = {
                id: Date.now(),
                type: 'wait',
                config: { delay: 1, delayUnit: 'hours' }
              };
              setFlowSteps(prev => [...prev, newStep]);
            }}
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Wait</span>
            <span className="text-xs text-gray-500 text-center mt-1">Add delay</span>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[200px] bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300 ease-in-out"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-blue-400', 'bg-blue-50', 'scale-[1.02]', 'shadow-lg');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'scale-[1.02]', 'shadow-lg');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'scale-[1.02]', 'shadow-lg');
          
          try {
            const stepData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (stepData.type !== 'reorder') {
              const newStep = {
                id: Date.now(),
                type: stepData.type,
                config: stepData.config || {}
              };
              setFlowSteps(prev => [...prev, newStep]);
            }
          } catch (error) {
            console.error('Error parsing dropped data:', error);
          }
        }}
      >
        <div className="text-center text-gray-500 mb-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
            <GripVertical className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium">Drag components here to build your flow</p>
          <p className="text-xs text-gray-400">Start with a trigger, then add your communication steps</p>
        </div>
        
        {/* Flow Preview */}
        {safeFlowSteps.length > 0 && (
          <div className="flex items-center justify-center space-x-3 flex-wrap">
            {safeFlowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Drop zone before first step */}
                {index === 0 && (
                  <div 
                    className="w-8 h-16 border-2 border-dashed border-transparent hover:border-blue-300 rounded-lg transition-colors"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const stepData = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (stepData.type !== 'reorder') {
                          const newStep = {
                            id: Date.now(),
                            type: stepData.type,
                            config: stepData.config || {}
                          };
                          setFlowSteps(prev => [newStep, ...prev]);
                        }
                      } catch (error) {
                        console.error('Error adding step at beginning:', error);
                      }
                    }}
                  />
                )}
                
                {index > 0 && (
                  <div className="flex items-center animate-fade-in">
                    <ArrowRight className="w-5 h-5 text-gray-400 animate-pulse" />
                  </div>
                )}
                
                {/* Drop zone between steps */}
                {index > 0 && (
                  <div 
                    className="w-8 h-16 border-2 border-dashed border-transparent hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-100', 'scale-110');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-100', 'scale-110');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-100', 'scale-110');
                      try {
                        const stepData = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (stepData.type !== 'reorder' && stepData.type !== 'trigger') {
                          const newStep = {
                            id: Date.now(),
                            type: stepData.type,
                            config: stepData.config || {}
                          };
                          setFlowSteps(prev => {
                            const newSteps = [...prev];
                            newSteps.splice(index, 0, newStep);
                            return newSteps;
                          });
                          toast({
                            title: "Step Added",
                            description: `${stepData.type} step inserted into your flow`,
                            variant: "default"
                          });
                        }
                      } catch (error) {
                        console.error('Error adding step between:', error);
                      }
                    }}
                  />
                )}
                <div 
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 group cursor-move animate-slide-in ${
                    step.type === 'trigger' ? 'bg-purple-50 border-purple-200' :
                    step.type === 'send_email' ? 'bg-blue-50 border-blue-200' :
                    step.type === 'send_sms' ? 'bg-green-50 border-green-200' :
                    'bg-orange-50 border-orange-200'
                  }`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'reorder',
                      stepId: step.id,
                      currentIndex: index
                    }));
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (dragData.type === 'reorder' && dragData.stepId !== step.id) {
                        const newSteps = [...safeFlowSteps];
                        const draggedStep = newSteps.find(s => s.id === dragData.stepId);
                        const draggedIndex = newSteps.findIndex(s => s.id === dragData.stepId);
                        const dropIndex = index;
                        
                        // Remove dragged step
                        newSteps.splice(draggedIndex, 1);
                        // Insert at new position
                        newSteps.splice(dropIndex, 0, draggedStep);
                        
                        setFlowSteps(newSteps);
                      }
                    } catch (error) {
                      console.error('Error reordering steps:', error);
                    }
                  }}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {step.type === 'trigger' && <Zap className="w-5 h-5 text-purple-600" />}
                  {step.type === 'send_email' && <Mail className="w-5 h-5 text-blue-600" />}
                  {step.type === 'send_sms' && <MessageSquare className="w-5 h-5 text-green-600" />}
                  {step.type === 'wait' && <Clock className="w-5 h-5 text-orange-600" />}
                  <span className="text-sm font-medium text-gray-800 text-center">
                    {step.type === 'trigger' ? 'Trigger' :
                     step.type === 'send_email' ? 'Email' :
                     step.type === 'send_sms' ? 'SMS' :
                     step.type === 'wait' ? 'Wait' :
                     step.type}
                  </span>
                  {step.type !== 'trigger' && (
                    <button
                      onClick={() => {
                        setFlowSteps(prev => prev.filter(s => s.id !== step.id));
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-full"
                      title="Delete step"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            ))}
            
            {/* Drop zone after last step */}
            {safeFlowSteps.length > 0 && (
              <div 
                className="w-8 h-16 border-2 border-dashed border-transparent hover:border-blue-300 rounded-lg transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const stepData = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (stepData.type !== 'reorder') {
                      const newStep = {
                        id: Date.now(),
                        type: stepData.type,
                        config: stepData.config || {}
                      };
                      setFlowSteps(prev => [...prev, newStep]);
                    }
                  } catch (error) {
                    console.error('Error adding step at end:', error);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center space-x-3 flex-wrap">
        {safeSelectedChannels.includes('email') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Add email step to existing flow (trigger already exists)
              const emailStep = { id: Date.now(), type: 'send_email', config: { template: 'Thank you email' } };
              setFlowSteps(prev => [...prev, emailStep]);
              toast({ title: "Email Added", description: "Email step added to your flow", variant: "default" });
            }}
            className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-300"
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Quick Email Flow</span>
          </Button>
        )}
        
        {safeSelectedChannels.includes('sms') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Add SMS step to existing flow (trigger already exists)
              const smsStep = { id: Date.now(), type: 'send_sms', config: { template: 'Thank you SMS' } };
              setFlowSteps(prev => [...prev, smsStep]);
              toast({ title: "SMS Added", description: "SMS step added to your flow", variant: "default" });
            }}
            className="flex items-center space-x-2 hover:bg-green-50 hover:border-green-300"
          >
            <MessageSquare className="w-4 h-4 text-green-600" />
            <span>Quick SMS Flow</span>
          </Button>
        )}
        
        {safeSelectedChannels.includes('email') && safeSelectedChannels.includes('sms') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Add complete email + SMS flow to existing trigger
              const newSteps = [
                { id: Date.now() + 1, type: 'send_email', config: { template: 'Initial email' } },
                { id: Date.now() + 2, type: 'wait', config: { delay: 5, delayUnit: 'hours' } },
                { id: Date.now() + 3, type: 'send_sms', config: { template: 'Follow-up SMS' } }
              ];
              setFlowSteps(prev => [...prev, ...newSteps]);
              toast({ title: "Complete Flow Added", description: "Email + SMS flow added to your automation", variant: "default" });
            }}
            className="flex items-center space-x-2 hover:bg-purple-50 hover:border-purple-300"
          >
            <Zap className="w-4 h-4 text-purple-600" />
            <span>Email + SMS Flow</span>
          </Button>
        )}
      </div>

      {safeSelectedChannels.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>No channels selected:</strong> Please go back to Step 2 and select at least one communication channel (Email or SMS) to build your automation flow.
          </p>
        </div>
      )}

      {safeSelectedChannels.length > 0 && safeFlowSteps.length === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Start by clicking one of the quick flow buttons above, or drag components from the top to build your custom automation.
          </p>
        </div>
      )}

      {safeErrors.flow && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 font-medium">
              {safeErrors.flow}
            </p>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Quick Start Templates - Now in Dropdown */}
      <div className="mb-6">
        <Label className="text-base font-medium mb-3 block">Quick Start Templates</Label>
        <p className="text-sm text-gray-600 mb-4">Choose a template or create from scratch.</p>
        
        <Select
          value={selectedQuickTemplate?.id || 'none'}
          onValueChange={(templateId) => {
            if (templateId === 'none') {
              setSelectedQuickTemplate(null);
            } else {
              const template = quickTemplates.find(t => t.id === templateId);
              if (template) {
                applyQuickTemplate(template);
              }
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a template or create from scratch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Create from scratch</SelectItem>
            {quickTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {template.channels.length} channel{template.channels.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedQuickTemplate && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {selectedQuickTemplate.name} Selected
              </span>
            </div>
                <div className="flex items-center space-x-1 text-xs">
              {selectedQuickTemplate.steps.slice(0, 4).map((step, index) => (
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
              {selectedQuickTemplate.steps.length > 4 && <span className="text-gray-400">...</span>}
                </div>
        </div>
        )}
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
                  ? crm.color === 'blue' ? 'border-blue-500 bg-blue-50' :
                    crm.color === 'green' ? 'border-green-500 bg-green-50' :
                    crm.color === 'purple' ? 'border-purple-500 bg-purple-50' :
                    crm.color === 'orange' ? 'border-orange-500 bg-orange-50' :
                    'border-gray-500 bg-gray-50'
                  : crm.available
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
            >
              {selectedCrm === key && (
                <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  crm.color === 'blue' ? 'bg-blue-500' :
                  crm.color === 'green' ? 'bg-green-500' :
                  crm.color === 'purple' ? 'bg-purple-500' :
                  crm.color === 'orange' ? 'bg-orange-500' :
                  'bg-gray-500'
                }`}>
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
          <div className={`mt-4 p-3 rounded-md border ${
            CRM_OPTIONS[selectedCrm].color === 'blue' ? 'bg-blue-50 border-blue-200' :
            CRM_OPTIONS[selectedCrm].color === 'green' ? 'bg-green-50 border-green-200' :
            CRM_OPTIONS[selectedCrm].color === 'purple' ? 'bg-purple-50 border-purple-200' :
            CRM_OPTIONS[selectedCrm].color === 'orange' ? 'bg-orange-50 border-orange-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Building className={`w-4 h-4 ${
                CRM_OPTIONS[selectedCrm].color === 'blue' ? 'text-blue-600' :
                CRM_OPTIONS[selectedCrm].color === 'green' ? 'text-green-600' :
                CRM_OPTIONS[selectedCrm].color === 'purple' ? 'text-purple-600' :
                CRM_OPTIONS[selectedCrm].color === 'orange' ? 'text-orange-600' :
                'text-gray-600'
              }`} />
              <span className={`text-sm font-medium ${
                CRM_OPTIONS[selectedCrm].color === 'blue' ? 'text-blue-800' :
                CRM_OPTIONS[selectedCrm].color === 'green' ? 'text-green-800' :
                CRM_OPTIONS[selectedCrm].color === 'purple' ? 'text-purple-800' :
                CRM_OPTIONS[selectedCrm].color === 'orange' ? 'text-orange-800' :
                'text-gray-800'
              }`}>
                {CRM_OPTIONS[selectedCrm].name} Selected
              </span>
            </div>
            <p className={`text-xs mt-1 ${
              CRM_OPTIONS[selectedCrm].color === 'blue' ? 'text-blue-700' :
              CRM_OPTIONS[selectedCrm].color === 'green' ? 'text-green-700' :
              CRM_OPTIONS[selectedCrm].color === 'purple' ? 'text-purple-700' :
              CRM_OPTIONS[selectedCrm].color === 'orange' ? 'text-orange-700' :
              'text-gray-700'
            }`}>
              Next: Choose specific events that will trigger this automation
            </p>
          </div>
        )}
      </div>

      {/* Trigger Selection moved to bottom */}
      {selectedCrm && selectedCrm !== 'manual' && (
        <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-medium">Select Trigger Events *</Label>
            <button
              onClick={() => {
                setShowTriggerDropdown(!showTriggerDropdown);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              <span>Choose Events</span>
              {showTriggerDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {!showTriggerDropdown && (
            <div className="text-sm text-gray-600 mb-2 p-2 bg-white rounded border">
              💡 Click "Choose Events" to see available triggers for {CRM_OPTIONS[selectedCrm]?.name}
            </div>
          )}
          
          {showTriggerDropdown && (
            <div className="mt-4 border-2 border-blue-200 rounded-lg p-4 bg-white shadow-sm max-h-96 overflow-y-auto">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">Available Triggers for {CRM_OPTIONS[selectedCrm]?.name}</h4>
                <p className="text-sm text-gray-600">Select one or more events that will trigger this automation</p>
              </div>
              
              {/* Group triggers by category */}
              {(() => {
                const triggers = getAvailableTriggers();
                const categories = {};
                Object.entries(triggers).forEach(([triggerId, trigger]) => {
                  if (!categories[trigger.category]) {
                    categories[trigger.category] = [];
                  }
                  categories[trigger.category].push([triggerId, trigger]);
                });
                
                return Object.entries(categories).map(([category, categoryTriggers]) => (
                  <div key={category} className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2 text-sm uppercase tracking-wide">{category}</h5>
                    <div className="space-y-2">
                      {categoryTriggers.map(([triggerId, trigger]) => (
                        <div key={triggerId} className="flex items-start space-x-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={triggerId}
                            checked={selectedTriggers[triggerId] || false}
                            onChange={(e) => handleTriggerChange(triggerId, e.target.checked)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <label htmlFor={triggerId} className="flex items-center space-x-2 cursor-pointer">
                              <span className="text-lg">{trigger.icon}</span>
                              <div>
                                <div className="font-medium text-sm text-gray-900">{trigger.name}</div>
                                <div className="text-xs text-gray-600">{trigger.description}</div>
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
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
              ? 'border-4 border-blue-600 bg-blue-50 ring-4 ring-blue-300 shadow-lg' 
              : 'border-4 border-gray-500 hover:border-gray-600 hover:shadow-md'
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
              ? 'border-4 border-green-600 bg-green-50 ring-4 ring-green-300 shadow-lg' 
              : 'border-4 border-gray-500 hover:border-gray-600 hover:shadow-md'
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

  // DELETED DUPLICATE FUNCTION
  const renderStep4Old_DELETE_DISABLED = () => (
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
                      
                      {/* AI Timing Optimization - Compact Inline */}
                      <div className="mt-3 flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">AI Timing Optimization</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={aiTimingEnabled}
                            onCheckedChange={(enabled) => {
                            setAiTimingEnabled(enabled);
                            if (!enabled) {
                              // Reset to manual timing if AI is disabled
                              updateStepConfig(step.id, 'delay', 1);
                              updateStepConfig(step.id, 'delayUnit', 'hours');
                            }
                          }}
                            className="data-[state=checked]:bg-purple-600"
                          />
                          <button
                            onClick={() => {
                              // Show detailed AI info in a modal or expand
                              toast({
                                title: "AI Timing Optimization",
                                description: "AI analyzes customer behavior patterns to determine optimal send times for maximum engagement. Considers timezone, activity patterns, and historical response rates.",
                                variant: "default"
                              });
                            }}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                      <Label>Template/Message</Label>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // AI Generate message
                              toast({
                                title: "AI Message Generation",
                                description: "AI will generate a personalized message based on your business and customer data.",
                                variant: "default"
                              });
                            }}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          >
                            <Brain className="w-3 h-3" />
                            <span>AI Generate</span>
                          </button>
                          <button
                            onClick={() => {
                              // AI Enhance message
                              toast({
                                title: "AI Message Enhancement",
                                description: "AI will improve your message for better engagement and clarity.",
                                variant: "default"
                              });
                            }}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Zap className="w-3 h-3" />
                            <span>AI Enhance</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative">
                      <Input
                        value={step.config.template}
                        onChange={(e) => updateStepConfig(step.id, 'template', e.target.value)}
                        placeholder="Template name or message content"
                          className="pr-20"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <Select>
                            <SelectTrigger className="w-16 h-8 text-xs border-none bg-transparent hover:bg-gray-100">
                              <SelectValue placeholder="+" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="business_name">Business Name</SelectItem>
                              <SelectItem value="customer_first_name">Customer First Name</SelectItem>
                              <SelectItem value="customer_last_name">Customer Last Name</SelectItem>
                              <SelectItem value="customer_email">Customer Email</SelectItem>
                              <SelectItem value="customer_phone">Customer Phone</SelectItem>
                              <SelectItem value="service_date">Service Date</SelectItem>
                              <SelectItem value="invoice_amount">Invoice Amount</SelectItem>
                              <SelectItem value="job_description">Job Description</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 text-xs">
                        <span className="text-gray-500">Quick insert:</span>
                        {['Business Name', 'First Name', 'Last Name', 'Service Date'].map((field) => (
                          <button
                            key={field}
                            onClick={() => {
                              const fieldKey = field.toLowerCase().replace(' ', '_');
                              const currentTemplate = step.config.template || '';
                              const newTemplate = currentTemplate + `{${fieldKey}}`;
                              updateStepConfig(step.id, 'template', newTemplate);
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                      
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
            Messages won't be sent during these hours to respect customer preferences
            </p>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Stop if review received</Label>
              <p className="text-sm text-gray-500">Automatically pause automation when customer leaves a review in your private inbox</p>
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
                {CRM_OPTIONS[selectedCrm]?.name || 'Manual'}
                {Object.keys(selectedTriggers).length > 0 && ` - ${Object.keys(selectedTriggers).map(triggerId => {
                  const trigger = getAvailableTriggers()[triggerId];
                  return trigger?.name;
                }).join(', ')}`}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600">Steps ({formData.steps.length})</Label>
              <div className="space-y-2">
                {formData.steps.map((step, index) => {
                  const stepType = stepTypes.find(t => t.id === step.type);
                  const Icon = stepType?.icon || Mail;
                  return (
                    <div key={step.id} className="flex items-center space-x-2 text-sm">
                      <span className="w-6 text-gray-500">{index + 1}.</span>
                      <Icon className="h-4 w-4" />
                      <span>{stepType?.label || step.type}</span>
                      {step.type === 'wait' && (
                        <span className="text-gray-500">({step.config.delay}{step.config.delayUnit?.charAt(0) || 'h'})</span>
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
    { number: 3, title: 'Flow Builder', description: 'Drag & drop to build flow' },
    { number: 4, title: 'Customize', description: 'Configure steps & timing' },
    { number: 5, title: 'Settings', description: 'Configure behavior' },
    { number: 6, title: 'Review', description: 'Activate sequence' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] h-[90vh] max-w-none overflow-y-auto">
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
          {currentStep === 3 && renderFlowBuilder()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* Footer - Fixed positioning with proper spacing */}
        <div className={`mt-8 pt-4 border-t bg-white ${showTriggerDropdown ? 'relative' : 'sticky bottom-0'} z-10 shadow-lg`}>
          <DialogFooter className="flex justify-between items-center bg-white">
            <div className="flex-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationWizard;
