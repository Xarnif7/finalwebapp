import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const OnboardingChecklist = ({ isOpen, onClose }) => {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'connect-crm',
      title: 'Connect Your CRM',
      description: 'Link your CRM or payment system to Zapier',
      action: 'Open Zapier Template',
      url: 'https://zapier.com/app/editor/123456789/step-1',
      required: true
    },
    {
      id: 'map-fields',
      title: 'Map Required Fields',
      description: 'Ensure email/phone + external_id are mapped',
      action: 'Check Field Mapping',
      required: true
    },
    {
      id: 'add-token',
      title: 'Add Blipp Token',
      description: 'Configure authentication with your Zapier token',
      action: 'Get Token',
      required: true
    },
    {
      id: 'test-zap',
      title: 'Test the Zap',
      description: 'Send a test event to verify everything works',
      action: 'Send Test Event',
      required: true
    },
    {
      id: 'verify-customer',
      title: 'Verify Customer Import',
      description: 'Check that customer appears in Blipp dashboard',
      action: 'Check Customers Tab',
      required: true
    },
    {
      id: 'check-sequence',
      title: 'Verify Automation',
      description: 'Confirm sequence is active and triggered',
      action: 'Check Automations Tab',
      required: true
    }
  ];

  const handleStepComplete = (stepId) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const handleStepAction = async (step) => {
    if (step.url) {
      window.open(step.url, '_blank');
    } else if (step.id === 'add-token') {
      // Generate Zapier token
      await handleGenerateToken();
    } else if (step.id === 'test-zap') {
      // Trigger test event
      handleTestEvent();
    }
  };

  const handleGenerateToken = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        toast.error('Please sign in first');
        return;
      }

      const response = await fetch('/api/zapier/generate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.token);
        toast.success('Zapier token generated and copied to clipboard!');
        handleStepComplete('add-token');
      } else {
        toast.error('Failed to generate token');
      }
    } catch (error) {
      toast.error('Error generating token');
    }
  };

  const handleTestEvent = async () => {
    try {
      const response = await fetch('/api/zapier/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Token': 'test_token'
        },
        body: JSON.stringify({
          event_type: 'job_completed',
          email: 'test@example.com',
          external_id: 'test_123',
          service_date: new Date().toISOString().split('T')[0],
          payload: {
            job_id: 'test_job_789',
            service_type: 'demo',
            amount: 100.00
          }
        })
      });

      if (response.ok) {
        toast.success('Test event sent successfully!');
        handleStepComplete('test-zap');
      } else {
        toast.error('Test event failed. Check your setup.');
      }
    } catch (error) {
      toast.error('Error sending test event');
    }
  };

  const completedCount = completedSteps.size;
  const totalSteps = steps.length;
  const progress = (completedCount / totalSteps) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Zapier Integration Setup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completedCount}/{totalSteps} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = index === currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200' 
                      : isCurrent 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{step.title}</h3>
                        {step.required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="default" className="text-xs bg-green-600">Completed</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => handleStepAction(step)}
                          className="flex items-center gap-2"
                        >
                          {step.url && <ExternalLink className="w-4 h-4" />}
                          {step.token && <Copy className="w-4 h-4" />}
                          {step.action}
                        </Button>
                        
                        {!isCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStepComplete(step.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Need Help?</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Check the integration guide for detailed setup instructions and troubleshooting tips.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('/docs/zapier-integration-guide.md', '_blank')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View Integration Guide
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {completedCount === totalSteps && (
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Setup Complete!
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingChecklist;
