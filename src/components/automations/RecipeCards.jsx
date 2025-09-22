import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  Clock, 
  Play, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle as CheckIcon,
  DollarSign
} from 'lucide-react';
import { useSequenceDesigner } from '../../hooks/useSequenceDesigner';
import { useSequencesData } from '../../hooks/useSequencesData';
import { useToast } from '../../hooks/useToast';

const RecipeCards = ({ isZapierConnected, onSequenceCreated, onConnectZapier, onGoToSequences }) => {
  const [creating, setCreating] = useState(null);
  const [testing, setTesting] = useState(null);
  const [showPreview, setShowPreview] = useState({});
  const { createSequenceWithSteps } = useSequenceDesigner();
  const { sequences } = useSequencesData();
  const { toastSuccess, toastError } = useToast();

  const recipes = [
    {
      id: 'job-completed',
      title: 'Job Completed → Review Request',
      description: 'Send Email → Wait 5h → Send SMS',
      icon: <Zap className="w-6 h-6" />,
      trigger: 'job_completed',
      steps: [
        { kind: 'send_email', step_index: 0, wait_ms: null, template_id: null, label: 'Send Email' },
        { kind: 'wait', step_index: 1, wait_ms: 5 * 60 * 60 * 1000, template_id: null, label: 'Wait 5h' },
        { kind: 'send_sms', step_index: 2, wait_ms: null, template_id: null, label: 'Send SMS' }
      ],
      settings: {
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        rate_per_hour: 10,
        rate_per_day: 50
      }
    },
    {
      id: 'invoice-paid',
      title: 'Invoice Paid → Review Request',
      description: 'Send Email immediately',
      icon: <Mail className="w-6 h-6" />,
      trigger: 'invoice_paid',
      steps: [
        { kind: 'send_email', step_index: 0, wait_ms: null, template_id: null, label: 'Send Email' }
      ],
      settings: {
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        rate_per_hour: 15,
        rate_per_day: 100
      }
    },
    {
      id: 'service-reminder',
      title: 'Service Reminder',
      description: 'Wait 24h → Send SMS',
      icon: <MessageSquare className="w-6 h-6" />,
      trigger: 'service_delivered',
      steps: [
        { kind: 'wait', step_index: 0, wait_ms: 24 * 60 * 60 * 1000, template_id: null, label: 'Wait 24h' },
        { kind: 'send_sms', step_index: 1, wait_ms: null, template_id: null, label: 'Send SMS' }
      ],
      settings: {
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        rate_per_hour: 5,
        rate_per_day: 25
      }
    }
  ];

  // Format milliseconds into a short label (e.g., 5h, 24h, 2d)
  const formatWait = (ms) => {
    if (!ms) return '';
    const minutes = Math.round(ms / (60 * 1000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  // Render compact visual flow for a recipe
  const renderFlow = (recipe) => {
    const triggerIcon = (() => {
      switch (recipe.trigger) {
        case 'job_completed':
          return <CheckIcon className="w-4 h-4 text-emerald-600" />;
        case 'invoice_paid':
          return <DollarSign className="w-4 h-4 text-blue-600" />;
        case 'service_delivered':
        default:
          return <Clock className="w-4 h-4 text-orange-600" />;
      }
    })();

    const parts = [];
    // Start with trigger
    parts.push(
      <div key="trigger" className="flex items-center gap-1">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100" title="Trigger">
          {triggerIcon}
        </div>
      </div>
    );

    recipe.steps.forEach((step, idx) => {
      parts.push(
        <ArrowRight key={`arrow-${idx}`} className="w-4 h-4 text-slate-400" />
      );
      if (step.kind === 'wait') {
        parts.push(
          <div key={`wait-${idx}`} className="flex items-center gap-1" title={step.label}>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-[11px] text-slate-600">{formatWait(step.wait_ms)}</span>
          </div>
        );
      } else if (step.kind === 'send_email') {
        parts.push(
          <div key={`email-${idx}`} className="flex items-center gap-1" title="Send Email">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        );
      } else if (step.kind === 'send_sms') {
        parts.push(
          <div key={`sms-${idx}`} className="flex items-center gap-1" title="Send SMS">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100">
              <MessageSquare className="w-4 h-4 text-green-600" />
            </div>
          </div>
        );
      }
    });

    return (
      <div className="flex items-center flex-wrap gap-2" aria-label="Automation flow">
        {parts}
      </div>
    );
  };

  // Helper function to check if a recipe is enabled
  const isRecipeEnabled = (recipe) => {
    return sequences.some(seq => 
      seq.trigger_event_type === recipe.trigger && 
      (seq.status === 'active' || seq.status === 'paused')
    );
  };

  // Helper function to get the enabled sequence for a recipe
  const getEnabledSequence = (recipe) => {
    return sequences.find(seq => 
      seq.trigger_event_type === recipe.trigger && 
      (seq.status === 'active' || seq.status === 'paused')
    );
  };

  const handleEnableRecipe = async (recipe) => {
    try {
      setCreating(recipe.id);
      
      // Create the sequence with default settings
      const sequenceData = {
        name: recipe.title,
        trigger_event_type: recipe.trigger,
        allow_manual_enroll: false,
        status: 'active',
        ...recipe.settings
      };

      const newSequence = await createSequenceWithSteps(sequenceData, recipe.steps);

      toastSuccess(`${recipe.title} enabled successfully!`);
      
      if (onSequenceCreated) {
        onSequenceCreated(newSequence);
      }
    } catch (error) {
      console.error('Error enabling recipe:', error);
      toastError(`Failed to enable ${recipe.title}`);
    } finally {
      setCreating(null);
    }
  };

  const handleConnectZapier = async () => {
    try {
      if (onConnectZapier) {
        await onConnectZapier();
        // After connecting, mark zap_connected=true and enable the first recipe
        // This will be handled by the parent component
        toastSuccess('Connected to Zapier! Enabling default sequences...');
      } else {
        // Fallback: Open Zapier template link
        window.open('https://zapier.com/apps/blipp/integrations', '_blank');
      }
    } catch (error) {
      console.error('Error connecting to Zapier:', error);
      toastError('Failed to connect to Zapier');
    }
  };

  const handleViewSequence = (recipe) => {
    const sequence = getEnabledSequence(recipe);
    if (sequence) {
      toastSuccess(`Opening ${recipe.title} sequence`);
      if (onGoToSequences) {
        onGoToSequences(sequence);
      }
    }
  };

  const handleSendTest = async (recipe) => {
    try {
      setTesting(recipe.id);
      
      // Simulate a trigger event
      const testData = {
        event_type: recipe.trigger,
        email: 'test@example.com',
        phone: '+1234567890',
        first_name: 'Test',
        last_name: 'User',
        service_date: new Date().toISOString()
      };

      // This would call the Zapier event endpoint
      const response = await fetch('/api/zapier/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Token': process.env.REACT_APP_ZAPIER_TOKEN || 'test-token'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        toastSuccess(`Test ${recipe.trigger} event sent successfully!`);
      } else {
        throw new Error('Failed to send test event');
      }
    } catch (error) {
      console.error('Error sending test:', error);
      toastError('Failed to send test event');
    } finally {
      setTesting(null);
    }
  };

  const togglePreview = (recipeId) => {
    setShowPreview(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {recipes.map((recipe) => {
        const isEnabled = isRecipeEnabled(recipe);
        const enabledSequence = getEnabledSequence(recipe);
        
    return (
      <Card key={recipe.id} className="relative overflow-hidden hover:shadow-[0_8px_25px_rgba(26,115,232,0.15)] hover:-translate-y-1 transition-all duration-300 group">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-200">
                {recipe.icon}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors duration-200">
                  {recipe.title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {recipe.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isEnabled ? "default" : isZapierConnected ? "secondary" : "destructive"}
                className={
                  isEnabled 
                    ? "bg-green-100 text-green-800" 
                    : isZapierConnected 
                      ? "bg-yellow-100 text-yellow-800" 
                      : "bg-red-100 text-red-800"
                }
              >
                {isEnabled ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : isZapierConnected ? (
                  <AlertCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {isEnabled ? 'Enabled' : isZapierConnected ? 'Ready' : 'Connect Required'}
              </Badge>
              
              {/* Preview Steps Toggle */}
              <button
                onClick={() => togglePreview(recipe.id)}
                className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
                aria-label={`${showPreview[recipe.id] ? 'Hide' : 'Show'} preview steps`}
              >
                <span>Preview steps</span>
                {showPreview[recipe.id] ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Compact visual flow */}
                <div className="border border-slate-200/70 rounded-lg p-3 bg-white">
                  {renderFlow(recipe)}
                </div>

                {/* Settings Summary */}
                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>Quiet Hours: {recipe.settings.quiet_hours_start} - {recipe.settings.quiet_hours_end}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-3 h-3" />
                    <span>Rate: {recipe.settings.rate_per_hour}/hour, {recipe.settings.rate_per_day}/day</span>
                  </div>
                </div>

                {/* Single Primary Button */}
                <div className="pt-2">
                  {!isZapierConnected ? (
                    <Button
                      onClick={handleConnectZapier}
                      className="w-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect & Enable
                    </Button>
                  ) : !isEnabled ? (
                    <Button
                      onClick={() => handleEnableRecipe(recipe)}
                      disabled={creating === recipe.id}
                      className="w-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {creating === recipe.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enabling...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Enable
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleViewSequence(recipe)}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RecipeCards;
