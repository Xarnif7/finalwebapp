import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  CheckCircle, 
  Circle, 
  Zap, 
  Play, 
  BarChart3, 
  ExternalLink,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useZapierStatus } from '../../hooks/useZapierStatus';
import { useSequencesData } from '../../hooks/useSequencesData';
import { useAutomationLogs } from '../../hooks/useAutomationLogs';

const SetupGuideDrawer = ({ isOpen, onClose, onConnectZapier, onCreateSequence, onViewLogs }) => {
  const { isConnected: isZapierConnected, loading: zapierLoading } = useZapierStatus();
  const { sequences, loading: sequencesLoading } = useSequencesData();
  const { logs, loading: logsLoading } = useAutomationLogs();

  const [completionData, setCompletionData] = useState({
    zapierConnected: false,
    sequenceEnabled: false,
    reviewRequestSent: false
  });

  // Check completion status
  useEffect(() => {
    if (!zapierLoading && !sequencesLoading && !logsLoading) {
      // Step 1: Check if Zapier is connected
      const zapierConnected = isZapierConnected;
      
      // Step 2: Check if any sequence is enabled (active or paused)
      const sequenceEnabled = sequences.some(seq => 
        seq.status === 'active' || seq.status === 'paused'
      );
      
      // Step 3: Check if any review request was sent in the last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const reviewRequestSent = logs.some(log => 
        log.event_type === 'message_sent' && 
        new Date(log.created_at) >= fourteenDaysAgo
      );

      setCompletionData({
        zapierConnected,
        sequenceEnabled,
        reviewRequestSent
      });
    }
  }, [isZapierConnected, sequences, logs, zapierLoading, sequencesLoading, logsLoading]);

  const steps = [
    {
      id: 'connect-zapier',
      title: 'Connect Zapier',
      description: 'Connect your CRM and other tools to automatically trigger review requests',
      icon: <Zap className="h-5 w-5" />,
      completed: completionData.zapierConnected,
      action: 'Connect',
      onAction: onConnectZapier,
      loading: zapierLoading
    },
    {
      id: 'enable-sequence',
      title: 'Create or enable one QuickStart sequence',
      description: 'Set up your first automation sequence to start collecting reviews',
      icon: <Play className="h-5 w-5" />,
      completed: completionData.sequenceEnabled,
      action: 'Enable',
      onAction: onCreateSequence,
      loading: sequencesLoading
    },
    {
      id: 'send-review-request',
      title: 'Send your first review request',
      description: 'Test your automation by sending a review request to a customer',
      icon: <BarChart3 className="h-5 w-5" />,
      completed: completionData.reviewRequestSent,
      action: 'View Logs',
      onAction: onViewLogs,
      loading: logsLoading
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

  const getStepStatus = (step) => {
    if (step.loading) {
      return 'loading';
    }
    return step.completed ? 'completed' : 'pending';
  };

  const getStepIcon = (step) => {
    const status = getStepStatus(step);
    
    if (status === 'loading') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
    
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    
    return <Circle className="h-5 w-5 text-slate-400" />;
  };

  const getStepBadge = (step) => {
    const status = getStepStatus(step);
    
    if (status === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
    }
    
    if (status === 'loading') {
      return <Badge className="bg-blue-100 text-blue-800">Loading...</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Setup Guide</h2>
              <p className="text-sm text-slate-600">Get your automations running in 3 steps</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progress</span>
              <span className="text-sm text-slate-600">{completedSteps}/{totalSteps} steps</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="mt-2 text-xs text-slate-500">
              {completionPercentage}% complete
            </div>
          </div>

          {/* Steps */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Step Number */}
                  <div className="absolute left-0 top-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                    {index + 1}
                  </div>

                  {/* Step Content */}
                  <div className="ml-12">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStepIcon(step)}
                        <h3 className="font-medium text-slate-900">{step.title}</h3>
                      </div>
                      {getStepBadge(step)}
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">{step.description}</p>
                    
                    {!step.completed && !step.loading && (
                      <Button
                        onClick={step.onAction}
                        size="sm"
                        className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                      >
                        {step.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-4 top-8 w-px h-6 bg-slate-200" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-3">
                {completedSteps === totalSteps 
                  ? "🎉 Congratulations! You've completed the setup guide."
                  : `Complete ${totalSteps - completedSteps} more step${totalSteps - completedSteps !== 1 ? 's' : ''} to finish setup.`
                }
              </p>
              
              {completedSteps === totalSteps && (
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupGuideDrawer;
