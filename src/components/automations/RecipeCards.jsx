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
  AlertCircle
} from 'lucide-react';
import { useSequenceDesigner } from '../../hooks/useSequenceDesigner';
import { toast } from 'sonner';

const RecipeCards = ({ isZapierConnected, onSequenceCreated }) => {
  const [creating, setCreating] = useState(null);
  const [testing, setTesting] = useState(null);
  const { createSequenceWithSteps } = useSequenceDesigner();

  const recipes = [
    {
      id: 'job-completed',
      title: 'Job Completed → Review Request',
      description: 'Email → Wait 5h → SMS with quiet hours',
      icon: <Zap className="w-6 h-6" />,
      trigger: 'job_completed',
      steps: [
        { kind: 'send_email', step_index: 0, wait_ms: null, template_id: null },
        { kind: 'wait', step_index: 1, wait_ms: 5 * 60 * 60 * 1000, template_id: null }, // 5 hours
        { kind: 'send_sms', step_index: 2, wait_ms: null, template_id: null }
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
      description: 'Immediate email follow-up',
      icon: <Mail className="w-6 h-6" />,
      trigger: 'invoice_paid',
      steps: [
        { kind: 'send_email', step_index: 0, wait_ms: null, template_id: null }
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
      description: 'Wait 24h → SMS reminder',
      icon: <MessageSquare className="w-6 h-6" />,
      trigger: 'service_delivered',
      steps: [
        { kind: 'wait', step_index: 0, wait_ms: 24 * 60 * 60 * 1000, template_id: null }, // 24 hours
        { kind: 'send_sms', step_index: 1, wait_ms: null, template_id: null }
      ],
      settings: {
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        rate_per_hour: 5,
        rate_per_day: 25
      }
    }
  ];

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

      toast.success(`${recipe.title} enabled successfully!`);
      
      if (onSequenceCreated) {
        onSequenceCreated(newSequence);
      }
    } catch (error) {
      console.error('Error enabling recipe:', error);
      toast.error(`Failed to enable ${recipe.title}`);
    } finally {
      setCreating(null);
    }
  };

  const handleConnectZapier = () => {
    // Open Zapier template link
    window.open('https://zapier.com/apps/blipp/integrations', '_blank');
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
      const response = await fetch('http://localhost:3001/api/zapier/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Token': process.env.REACT_APP_ZAPIER_TOKEN || 'test-token'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        toast.success(`Test ${recipe.trigger} event sent successfully!`);
      } else {
        throw new Error('Failed to send test event');
      }
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Failed to send test event');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {recipes.map((recipe) => (
        <Card key={recipe.id} className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {recipe.icon}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {recipe.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {recipe.description}
                  </p>
                </div>
              </div>
              <Badge 
                variant={isZapierConnected ? "default" : "secondary"}
                className={isZapierConnected ? "bg-green-100 text-green-800" : ""}
              >
                {isZapierConnected ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {isZapierConnected ? 'Ready' : 'Connect Required'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Recipe Steps Preview */}
              <div className="space-y-2">
                {recipe.steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.kind === 'send_email' && <Mail className="w-4 h-4" />}
                      {step.kind === 'send_sms' && <MessageSquare className="w-4 h-4" />}
                      {step.kind === 'wait' && <Clock className="w-4 h-4" />}
                      <span className="capitalize">
                        {step.kind.replace('_', ' ')}
                        {step.wait_ms && ` (${Math.round(step.wait_ms / 1000 / 60 / 60)}h)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {!isZapierConnected ? (
                  <Button
                    onClick={handleConnectZapier}
                    className="flex-1 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect & Enable
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleEnableRecipe(recipe)}
                      disabled={creating === recipe.id}
                      className="flex-1 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {creating === recipe.id ? 'Enabling...' : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => handleSendTest(recipe)}
                      disabled={testing === recipe.id}
                      variant="outline"
                      size="sm"
                    >
                      {testing === recipe.id ? 'Sending...' : 'Send Test'}
                    </Button>
                  </>
                )}
              </div>

              {/* Settings Summary */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Quiet Hours: {recipe.settings.quiet_hours_start} - {recipe.settings.quiet_hours_end}</div>
                <div>Rate Limit: {recipe.settings.rate_per_hour}/hour, {recipe.settings.rate_per_day}/day</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RecipeCards;
