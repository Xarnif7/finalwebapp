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
  X,
  ChevronUp,
  Building,
  Check,
  Brain,
  Info,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useSequencesData } from '@/hooks/useSequencesData';
import { useZapierStatus } from '@/hooks/useZapierStatus';
import FlowBuilder from './FlowBuilder';
import AITimingOptimizer from './AITimingOptimizer';
import PerStepMessageEditor, { MESSAGE_TEMPLATES } from './MessageEditor';

const AutomationWizard = ({ isOpen, onClose, onSequenceCreated, initialTemplate = null }) => {
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

  // Always ensure we have a trigger as the first step when on Step 2 (Flow Builder)
  useEffect(() => {
    if (currentStep === 2) {
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
  const [selectedChannels, setSelectedChannels] = useState(['email', 'sms']); // Always include both channels by default
  const [aiTimingEnabled, setAiTimingEnabled] = useState(false);
  const [aiTimingData, setAiTimingData] = useState({});
  // Removed premade templates for now
  const [selectedCrm, setSelectedCrm] = useState(null);
  const [selectedManualTrigger, setSelectedManualTrigger] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState({});
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false);
  const [stepTimings, setStepTimings] = useState({});
  const [aiTimingPerStep, setAiTimingPerStep] = useState({});
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', message: '' });
  const [smsTemplate, setSmsTemplate] = useState({ message: '' });
  const [aiTone, setAiTone] = useState('friendly'); // friendly | professional | persuasive
  const [aiLength, setAiLength] = useState('medium'); // short | medium | long
  const [learnMoreModalOpen, setLearnMoreModalOpen] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});

  // Pre-fill form when customizing an existing template
  useEffect(() => {
    if (initialTemplate && isOpen) {
      console.log('📝 Pre-filling wizard with template:', initialTemplate);
      
      // Set form name and description
      setFormData(prev => ({
        ...prev,
        name: initialTemplate.name || '',
        description: initialTemplate.description || initialTemplate.config_json?.description || ''
      }));

      // Set trigger information
      if (initialTemplate.trigger_event_type) {
        // Parse trigger type (e.g., "quickbooks:invoice_paid" or "manual")
        const triggerParts = initialTemplate.trigger_event_type.split(':');
        if (triggerParts.length > 1) {
          const [crm, event] = triggerParts;
          setSelectedCrm(crm);
          setSelectedTriggers({ [event]: true });
        } else if (initialTemplate.trigger_event_type === 'manual') {
          setSelectedManualTrigger(true);
        }
      }

      // Convert config_json steps to flow steps
      if (initialTemplate.config_json?.steps && Array.isArray(initialTemplate.config_json.steps)) {
        const convertedSteps = initialTemplate.config_json.steps.map((step, index) => ({
          id: Date.now() + index,
          type: step.type || step.kind || 'email',
          config: step.config || {},
          message: step.message || {},
          timing: step.timing || { value: step.delay_hours || 24, unit: 'hours' }
        }));
        
        // Add trigger step at the beginning
        const triggerStep = {
          id: Date.now() - 1,
          type: 'trigger',
          config: {}
        };
        
        setFlowSteps([triggerStep, ...convertedSteps]);
      }

      // Set settings
      if (initialTemplate.config_json) {
        setFormData(prev => ({
          ...prev,
          settings: {
            quietHoursStart: initialTemplate.config_json.quiet_hours_start || '22:00',
            quietHoursEnd: initialTemplate.config_json.quiet_hours_end || '08:00',
            stopIfReview: initialTemplate.config_json.stop_if_review !== false,
            allowManualEnroll: initialTemplate.config_json.allow_manual_enroll !== false
          }
        }));
      }

      toast({
        title: "Template Loaded",
        description: `Customizing "${initialTemplate.name}"`,
      });
    }
  }, [initialTemplate, isOpen]);

  const stepTypes = [
    { id: 'send_email', label: 'Send Email', icon: Mail, description: 'Send email' },
    { id: 'wait', label: 'Wait', icon: Clock, description: 'Wait' },
    { id: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send SMS' }
  ];

  // Helper functions for per-step message configuration
  const updateFlowStepMessage = (stepId, messageData) => {
    setFlowSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, message: { ...step.message, ...messageData } }
        : step
    ));
  };

  const loadTemplateForStep = (stepId, stepType, purposeKey) => {
    const template = MESSAGE_TEMPLATES[purposeKey];
    if (!template) return;
    const channelTemplate = stepType === 'email' ? template.email : template.sms;
    updateFlowStepMessage(stepId, { purpose: purposeKey, ...channelTemplate });
    toast({
      title: "Template Loaded",
      description: `${template.name} template applied successfully`,
      variant: "default"
    });
  };

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
      available: true  // ← NOW AVAILABLE!
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

  // Jobber Triggers
  const JOBBER_TRIGGERS = {
    'job_started': {
      name: 'Job Started',
      description: 'When a job is started in Jobber',
      category: 'Jobs',
      icon: '🚀'
    },
    'job_completed': {
      name: 'Job Completed',
      description: 'When a job is marked as completed in Jobber',
      category: 'Jobs',
      icon: '✅'
    },
    'job_closed': {
      name: 'Job Closed',
      description: 'When a job is closed in Jobber',
      category: 'Jobs',
      icon: '🏁'
    },
    'visit_completed': {
      name: 'Visit Completed',
      description: 'When a visit/appointment is completed',
      category: 'Visits',
      icon: '📍'
    },
    'quote_approved': {
      name: 'Quote Approved',
      description: 'When a customer approves a quote',
      category: 'Quotes',
      icon: '👍'
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
    'client_created': {
      name: 'Client Created',
      description: 'When a new client is added to Jobber',
      category: 'Clients',
      icon: '👤'
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
    setSelectedCrm(null);
    setSelectedManualTrigger(false);
    setSelectedTriggers({});
    setShowTriggerDropdown(false);
  };

  // Helper function to get available triggers for selected CRM
  const getAvailableTriggers = () => {
    switch (selectedCrm) {
      case 'qbo':
        return QBO_TRIGGERS;
      case 'jobber':
        return JOBBER_TRIGGERS;
      case 'manual':
        return MANUAL_TRIGGERS;
      default:
        return {};
    }
  };

  // Helper function to handle CRM selection
  const handleCrmChange = (crmId) => {
    if (crmId === 'manual') {
      // Toggle manual trigger selection - this is independent of CRM selection
      setSelectedManualTrigger(!selectedManualTrigger);
    } else {
      // Toggle CRM system selection - click again to deselect
      if (selectedCrm === crmId) {
        // Deselecting the current CRM
        setSelectedCrm(null);
        setSelectedTriggers({});
        setShowTriggerDropdown(false);
        updateFormData('triggerType', '');
      } else {
        // Selecting a new CRM system
    setSelectedCrm(crmId);
    setSelectedTriggers({});
    setShowTriggerDropdown(false);
    updateFormData('triggerType', crmId);
      }
    }
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

  const scrollToFirstError = (errors) => {
    // Scroll to the first error field
    if (errors.name) {
      const nameField = document.getElementById('name');
      if (nameField) {
        nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameField.focus();
      }
    } else if (errors.triggers) {
      // Scroll to the CRM selection area
      const crmSection = document.querySelector('[data-crm-section]');
      if (crmSection) {
        crmSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Step 1: Basic Info validation
    if (currentStep === 1) {
    if (!formData.name.trim()) {
      newErrors.name = 'Sequence name is required';
    }

      // Validate that we have either a CRM selected OR manual trigger selected (or both)
      const hasCrmSelected = selectedCrm && selectedCrm !== 'manual';
      const hasManualTrigger = selectedManualTrigger;
      
      if (!hasCrmSelected && !hasManualTrigger) {
        newErrors.triggers = 'Please select at least one CRM system or enable manual trigger';
      }
      
      // If a CRM is selected, validate that trigger events are also selected
      if (hasCrmSelected && Object.keys(selectedTriggers).length === 0) {
        newErrors.triggers = 'Please select at least one trigger event for the selected CRM system';
      }
    }

    // Step 2: Flow validation (formerly step 3)
    if (currentStep === 2) {
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

    // Step 3: Messages validation - optional, allow users to proceed with empty templates
    if (currentStep === 3) {
      // Messages are optional - users can customize them or leave them empty
      // No validation needed here as templates can be empty initially
    }

    setErrors(newErrors);
    
    // If there are errors and we're on Step 1, scroll to the first error
    if (Object.keys(newErrors).length > 0 && currentStep === 1) {
      scrollToFirstError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Validate current step before proceeding to next step
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
    console.log('🚀🚀🚀 handleCreate called - Starting sequence creation...');
    console.log('📋 Current step:', currentStep);
    console.log('📋 Current form data:', formData);
    console.log('📋 Flow steps:', flowSteps);
    console.log('📋 Selected CRM:', selectedCrm);
    console.log('📋 Selected triggers:', selectedTriggers);
    console.log('📋 Manual trigger:', selectedManualTrigger);

    // Run validation and show detailed errors
    const validationResult = validateForm();
    console.log('🔍 Validation result:', validationResult);
    console.log('🔍 Current errors:', errors);
    
    if (!validationResult) {
      console.error('❌❌❌ Validation failed!');
      console.error('❌ Errors object:', JSON.stringify(errors, null, 2));
      toast({
        title: "Validation Error",
        description: Object.values(errors)[0] || "Please fix the errors before creating the sequence",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Validation passed!');
    setIsCreating(true);
    try {
      // Convert flowSteps to sequence steps with per-step message config
      const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
      console.log('📊 Safe flow steps count:', safeFlowSteps.length);
      
      const sequenceSteps = safeFlowSteps
        .filter(step => step.type !== 'trigger') // Remove trigger from steps
        .map((step, index) => {
          const stepType = step.type === 'email' ? 'send_email' : 
                          step.type === 'sms' ? 'send_sms' :
                          step.type;
          
          // Get timing from stepTimings state (user's input) or fallback to step.timing
          const currentTiming = stepTimings[step.id] || step.timing || { value: 0, unit: 'hours' };
          const waitMs = currentTiming.value * 
            (currentTiming.unit === 'hours' ? 3600000 : 
             currentTiming.unit === 'minutes' ? 60000 : 
             86400000);
          
          const baseStep = {
            kind: stepType,
            step_index: index + 1,
            wait_ms: waitMs, // Use the timing from user input
            config: step.config || {}
          };

          // Add per-step message configuration for email/sms steps
          if (stepType === 'send_email' || stepType === 'send_sms') {
            const message = step.message || {};
            baseStep.message_purpose = message.purpose || 'custom';
            baseStep.message_config = {
              purpose: message.purpose || 'custom',
              ...(stepType === 'send_email' && {
                subject: message.subject || 'Message from {{business.name}}',
                body: message.body || 'Thank you for your business!'
              }),
              ...(stepType === 'send_sms' && {
                body: message.body || 'Thank you for your business!'
              })
            };
          }

          return baseStep;
        });

      console.log('📝 Sequence steps to create:', sequenceSteps);

      const sequenceData = {
        name: formData.name,
        description: formData.description,
        trigger_type: selectedCrm || (selectedManualTrigger ? 'manual' : null),
        trigger_event_type: Object.keys(selectedTriggers).length > 0 ? Object.keys(selectedTriggers)[0] : null,
        allow_manual_enroll: selectedManualTrigger || formData.settings.allowManualEnroll,
        quiet_hours_start: formData.settings.quietHoursStart,
        quiet_hours_end: formData.settings.quietHoursEnd,
        status: 'active',
        steps: sequenceSteps
      };

      console.log('📦 Final sequence data to send:', JSON.stringify(sequenceData, null, 2));

      const result = await createSequence(sequenceData);
      
      console.log('✅ Sequence created successfully:', result);
      
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
      console.error('❌ Error creating sequence:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      toast({
        title: "Error",
        description: error.message || "Failed to create sequence. Please try again.",
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
        {/* Journey Flow Header */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="h-6 w-6 text-blue-600" />
            Build Your Journey Flow
          </h3>
          <p className="text-sm text-gray-600 mt-2">
            Drag and drop your steps. Each message will send based on your timing rules.
          </p>
          
          <div className="bg-white border border-blue-200 rounded-lg p-3 mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Email</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">SMS</span>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Both Channels Active
            </Badge>
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
      {/* Journey Header */}
      <div className="mb-6 pb-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Journey Basics</h2>
        <p className="text-sm text-gray-600 mt-1">Name your journey and choose when it should start</p>
      </div>

      {/* Sequence Details */}
      <div className="border-t pt-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Sequence Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="e.g., Job Completed Follow-up"
              className={`${errors.name ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:border-transparent`}
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
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* CRM Selection */}
      <div data-crm-section>
        <Label className="text-sm font-medium text-gray-900 mb-3 block">Choose Trigger Source *</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(CRM_OPTIONS).map(([key, crm]) => (
              <button
              key={key}
              onClick={() => !crm.available ? null : handleCrmChange(key)}
              disabled={!crm.available}
              className={`relative p-4 rounded-lg border-2 transition-colors ${
                (key === 'manual' && selectedManualTrigger) || (key !== 'manual' && selectedCrm === key)
                  ? 'border-blue-600 bg-blue-50'
                  : crm.available
                  ? 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
              }`}
            >
              {((key === 'manual' && selectedManualTrigger) || (key !== 'manual' && selectedCrm === key)) && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
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

      {/* Trigger Selection moved to bottom - only show for CRM systems */}
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
            <div className="mt-4 border-2 border-blue-200 rounded-lg bg-white shadow-sm">
              <div className="p-4 max-h-96 overflow-y-auto">
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
              
              {/* Footer inside dropdown when open */}
              <div className="border-t bg-white p-4">
                <div className="flex justify-between items-center space-x-4">
                  <div className="flex items-center">
                    {currentStep > 1 && (
                      <Button variant="outline" onClick={handlePrevious}>
                        Previous
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
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
                </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
        <Card 
          className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
            selectedChannels.includes('email') 
              ? 'border-2 border-blue-600 bg-blue-50 ring-2 ring-blue-300 shadow-lg' 
              : 'border-2 border-gray-500 hover:border-gray-600 hover:shadow-md'
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
          className={`cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset ${
            selectedChannels.includes('sms') 
              ? 'border-2 border-green-600 bg-green-50 ring-2 ring-green-300 shadow-lg' 
              : 'border-2 border-gray-500 hover:border-gray-600 hover:shadow-md'
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
    const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];

  const toggleAiTiming = (stepId) => {
    setAiTimingPerStep(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };



  const getStepTimingSummary = (step) => {
    const isAiEnabled = aiTimingPerStep[step.id] || false;
    const currentTiming = stepTimings[step.id] || step.timing || { value: 1, unit: 'hours' };
    
    if (isAiEnabled) {
      return `AI Optimize • Est. Tomorrow 9:00–10:30 AM`;
    } else {
      return `Manual • Send +${currentTiming.value}${currentTiming.unit.charAt(0)} after previous step`;
    }
  };

  const toggleStepExpansion = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const updateStepTiming = (stepId, timing) => {
    console.log('🔧 updateStepTiming called:', { stepId, timing });
    setStepTimings(prev => {
      const newTimings = {
        ...prev,
        [stepId]: timing
      };
      console.log('🔧 New stepTimings:', newTimings);
      return newTimings;
    });
  };

    const getStepIcon = (stepType) => {
      switch (stepType) {
        case 'trigger': return Zap;
        case 'email': return Mail;
        case 'sms': return MessageSquare;
        case 'wait': return Clock;
        default: return Clock;
      }
    };

    const getStepColor = (stepType) => {
      switch (stepType) {
        case 'trigger': return 'bg-purple-500';
        case 'email': return 'bg-blue-500';
        case 'sms': return 'bg-green-500';
        case 'wait': return 'bg-orange-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <div className="space-y-6">
        {/* Messages Header */}
        <div className="pb-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            Customize Messages
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure each message in your journey
          </p>
        </div>

        {/* Per-Step Message Editors */}
        <PerStepMessageEditor
          flowSteps={safeFlowSteps}
          updateFlowStepMessage={updateFlowStepMessage}
          loadTemplateForStep={loadTemplateForStep}
          toast={toast}
        />
      </div>
    );
  };


  const renderLearnMoreModal = () => {
    return (
      <Dialog open={learnMoreModalOpen} onOpenChange={setLearnMoreModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-blue-600">🧠</span>
              AI Smart Timing - How It Works
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
                Our AI analyzes multiple data points to determine the optimal send time for each message, 
                maximizing engagement and response rates.
            </p>
          </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Factors We Consider</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">1</span>
      </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Past Engagement Data</h5>
                      <p className="text-sm text-gray-600">Open times, click rates, and response patterns from your previous campaigns</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">2</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Customer Timezone</h5>
                      <p className="text-sm text-gray-600">Automatically detects and respects each customer's local time zone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Day of Week Patterns</h5>
                      <p className="text-sm text-gray-600">Identifies when your audience is most active during the week</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">4</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Message Type</h5>
                      <p className="text-sm text-gray-600">Different optimal times for emails vs SMS based on content and urgency</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">5</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Industry Benchmarks</h5>
                      <p className="text-sm text-gray-600">Best practices and timing patterns from similar businesses in your industry</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">6</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">Message Fatigue Prevention</h5>
                      <p className="text-sm text-gray-600">Spaces out messages to avoid overwhelming customers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-green-600">✅</span>
                <div>
                  <h5 className="font-medium text-green-900 mb-1">You Stay in Control</h5>
                  <p className="text-sm text-green-800">
                    AI handles the timing automatically, but you can always switch any step to manual timing 
                    or override the AI's decision. The system learns and improves over time as it gathers more data.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setLearnMoreModalOpen(false)}>
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // New Timing Step (Step 4 in the new flow)
  const renderTimingStep = () => {
    const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];

    return (
      <div className="space-y-6">
        {/* Timing Header */}
        <div className="pb-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Timing & Rules
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Control when each message is sent
          </p>
        </div>

        {/* AI Smart Timing Toggle */}
        <div className="flex items-center justify-between p-4 bg-white border rounded-lg">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">AI Smart Timing</h4>
              <p className="text-sm text-gray-600">Let AI optimize send times for best engagement</p>
            </div>
          </div>
          <Switch 
            checked={aiTimingEnabled} 
            onCheckedChange={setAiTimingEnabled}
          />
        </div>

        {/* Per-Step Timing */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Step Delays</h4>
          {safeFlowSteps.filter(step => step.type !== 'trigger').map((step, index) => {
            const Icon = step.type === 'email' ? Mail : step.type === 'sms' ? MessageSquare : Clock;
            const currentTiming = stepTimings[step.id] || step.timing || { value: 1, unit: 'hours' };
            const isAiEnabled = aiTimingEnabled;
            
            return (
              <Card key={step.id} className={`shadow-sm ${isAiEnabled ? 'ring-2 ring-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50' : ''}`}>
                <CardContent className="p-6 flex items-center justify-center min-h-[80px]">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        step.type === 'email' ? 'bg-blue-100' : 
                        step.type === 'sms' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          step.type === 'email' ? 'text-blue-600' : 
                          step.type === 'sms' ? 'text-green-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="text-base font-medium">
                        {step.type === 'email' ? 'Email' : step.type === 'sms' ? 'SMS' : 'Wait'} Step {index + 1}
                      </span>
                      {isAiEnabled && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                          <Brain className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">AI Optimized</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Send after</span>
                      <Input 
                        type="number" 
                        value={currentTiming.value}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          console.log('🔧 Timing input changed:', newValue, 'for step:', step.id, 'current timing:', currentTiming);
                          updateStepTiming(step.id, { ...currentTiming, value: newValue });
                        }}
                        className="w-24"
                        min="0"
                        placeholder="0"
                        step="1"
                      />
                      <Select 
                        value={currentTiming.unit}
                        onValueChange={(unit) => {
                          console.log('🔧 Timing unit changed:', unit, 'for step:', step.id);
                          updateStepTiming(step.id, { ...currentTiming, unit });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">hours</SelectItem>
                          <SelectItem value="days">days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quiet Hours */}
        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[120px]">
            <div className="w-full">
              <div className="flex items-center gap-3 mb-6 justify-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <span className="text-lg">🌙</span>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-medium text-gray-700">Quiet Hours</h4>
                  <p className="text-xs text-gray-500">Messages won't send during these hours</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Time</Label>
                  <Input 
                    type="time" 
                    value={formData.settings.quietHoursStart}
                    onChange={(e) => updateFormData('settings', { ...formData.settings, quietHoursStart: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">End Time</Label>
                  <Input 
                    type="time" 
                    value={formData.settings.quietHoursEnd}
                    onChange={(e) => updateFormData('settings', { ...formData.settings, quietHoursEnd: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="pb-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          Behavior Settings
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Control how your journey responds to customer actions
        </p>
      </div>

      {/* Stop if Review Card */}
      <Card className="shadow-md border-2 border-green-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  ✅ Stop if Review Received
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically pause journey when customer leaves a review
                </p>
              </div>
            </div>
            <Switch
              checked={formData.settings.stopIfReview}
              onCheckedChange={(checked) => updateFormData('settings', {
                ...formData.settings,
                stopIfReview: checked
              })}
              className="ml-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Enrollment Card */}
      <Card className="shadow-md border-2 border-blue-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  👋 Allow Manual Enrollment
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Let you manually add customers from the Customers tab
                </p>
              </div>
            </div>
            <Switch
              checked={formData.settings.allowManualEnroll}
              onCheckedChange={(checked) => updateFormData('settings', {
                ...formData.settings,
                allowManualEnroll: checked
              })}
              className="ml-4"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep6 = () => {
    const safeFlowSteps = Array.isArray(flowSteps) ? flowSteps : [];
    
    return (
      <div className="space-y-6">
        {/* Review Header */}
        <div className="pb-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-gray-600" />
            Review & Activate Journey
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Review your journey settings before activation
          </p>
        </div>

        {/* Journey Summary Card */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-white">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Zap className="h-5 w-5 text-gray-600" />
              </div>
              <span>{formData.name || 'Untitled Journey'}</span>
            </CardTitle>
            {formData.description && (
              <p className="text-sm text-gray-600 mt-2">{formData.description}</p>
            )}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Trigger Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Trigger
              </Label>
              <p className="text-sm mt-2 text-gray-700">
                {CRM_OPTIONS[selectedCrm]?.name || 'Manual Trigger'}
                {Object.keys(selectedTriggers).length > 0 && (
                  <span className="block mt-1 text-xs text-gray-600">
                    Events: {Object.keys(selectedTriggers).map(triggerId => {
                      const trigger = getAvailableTriggers()[triggerId];
                      return trigger?.name;
                    }).join(', ')}
                  </span>
                )}
              </p>
            </div>

            {/* Journey Flow Timeline */}
            <div>
              <Label className="text-sm font-semibold text-gray-900 mb-3 block">Journey Flow Preview</Label>
              <div className="space-y-3">
                {/* Trigger Node */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-lg border">
                    <span className="text-sm font-medium text-gray-900">Journey Starts</span>
                  </div>
                </div>

                {/* Flow Steps */}
                {safeFlowSteps.filter(step => step.type !== 'trigger').map((step, index) => {
                  const Icon = step.type === 'email' ? Mail : step.type === 'sms' ? MessageSquare : Clock;
                  const iconColor = step.type === 'email' ? 'bg-blue-600' : step.type === 'sms' ? 'bg-green-600' : 'bg-orange-600';
                  
                  return (
                    <div key={step.id}>
                      <div className="flex items-center justify-center my-2">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${iconColor} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 bg-white p-3 rounded-lg border">
                          <span className="text-sm font-medium text-gray-900">
                            {step.type === 'email' ? 'Email' : step.type === 'sms' ? 'SMS' : 'Wait'} Step {index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settings Summary */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
              <Label className="text-sm font-semibold text-gray-900">Behavior Settings</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    Stop if review: <strong>{formData.settings.stopIfReview ? 'Yes' : 'No'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">
                    Manual add: <strong>{formData.settings.allowManualEnroll ? 'Yes' : 'No'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-gray-700">
                    Quiet hours: <strong>{formData.settings.quietHoursStart} - {formData.settings.quietHoursEnd}</strong>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
          <p className="text-green-800 font-medium">
            ✅ Ready to launch! Your customer journey is configured and ready to go.
          </p>
        </div>
      </div>
    );
  };

  const steps = [
    { number: 1, title: 'Journey Basics', description: 'Name your journey and choose triggers' },
    { number: 2, title: 'Build Flow', description: 'Design your customer journey' },
    { number: 3, title: 'Messages', description: 'Customize email & SMS content' },
    { number: 4, title: 'Timing', description: 'Set delays & smart timing' },
    { number: 5, title: 'Settings', description: 'Configure behavior rules' },
    { number: 6, title: 'Review', description: 'Review & activate journey' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] h-[90vh] max-w-none flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Create Journey
          </DialogTitle>

        {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6 mb-4 flex-shrink-0 px-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                  currentStep === step.number
                    ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                    : currentStep > step.number
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    currentStep === step.number ? 'text-gray-900' : currentStep > step.number ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-px mx-3 flex-1 ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        </DialogHeader>

        {/* Step Content - Flexible area */}
        <div className="flex-1 overflow-y-auto px-2">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderFlowBuilder()}
          {currentStep === 3 && renderStep4()}
          {currentStep === 4 && renderTimingStep()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* Footer - Fixed at bottom */}
        {(!showTriggerDropdown || currentStep !== 1) && (
          <div className="pt-4 border-t bg-white mt-auto">
          <DialogFooter className="flex justify-between items-center bg-white space-x-4">
            <div className="flex items-center">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {currentStep < 6 ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    console.log('🔘🔘🔘 CREATE JOURNEY BUTTON CLICKED! Current step:', currentStep);
                    console.log('🔘 isCreating:', isCreating);
                    console.log('🔘 About to call handleCreate...');
                    handleCreate();
                  }}
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create & Activate'
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
        )}
      </DialogContent>
      
      {/* Learn More Modal */}
      {renderLearnMoreModal()}
    </Dialog>
  );
};

export default AutomationWizard;
