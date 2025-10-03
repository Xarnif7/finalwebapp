import React from 'react';
import { Mail, MessageSquare, Clock, ArrowRight, CheckCircle } from 'lucide-react';

const FlowPreview = ({ channels, configJson, customMessage, templateName }) => {
  const steps = configJson?.steps || [];
  const delayHours = configJson?.delay_hours || 0;
  const delayMinutes = configJson?.delay_minutes || 0;

  // Create flow steps based on channels and delays
  const flowSteps = [];
  
  if (channels.includes('email')) {
    flowSteps.push({
      type: 'email',
      icon: Mail,
      label: 'Email',
      delay: delayHours > 0 ? `${delayHours}h` : delayMinutes > 0 ? `${delayMinutes}m` : 'Immediately',
      message: customMessage || configJson?.message || 'Your custom message will appear here'
    });
  }
  
  if (channels.includes('sms')) {
    flowSteps.push({
      type: 'sms',
      icon: MessageSquare,
      label: 'SMS',
      delay: delayHours > 0 ? `${delayHours + 1}h` : delayMinutes > 0 ? `${delayMinutes + 30}m` : '5m later',
      message: customMessage || configJson?.message || 'Your custom message will appear here'
    });
  }

  // Add any additional steps from config
  steps.forEach((step, index) => {
    if (step.channel && step.delay) {
      flowSteps.push({
        type: step.channel,
        icon: step.channel === 'email' ? Mail : MessageSquare,
        label: step.channel.toUpperCase(),
        delay: `${step.delay}${step.delayUnit || 'h'}`,
        message: step.message || customMessage || 'Your custom message will appear here'
      });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-medium text-gray-900">Your Automation Flow</h3>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          {flowSteps.length === 0 ? (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Configure your channels and timing to see the flow</p>
            </div>
          ) : (
            flowSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{step.label}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {step.delay}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {step.message}
                  </p>
                </div>
                
                {index < flowSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {templateName && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            This flow will be triggered by: <span className="font-medium">{templateName}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default FlowPreview;
