import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  MessageSquare,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  Rocket,
  CheckCircle2
} from 'lucide-react';

const JOURNEY_TEMPLATES = [
  {
    id: 'job-completed-review',
    name: 'Job Completed → Review Request',
    description: 'Send thank you email, then follow up with SMS for review',
    icon: CheckCircle2,
    color: 'bg-green-500',
    trigger: 'job_completed',
    steps: 2,
    channels: ['email', 'sms'],
    time: '2-3 days',
    popular: true,
    preview: [
      { type: 'email', delay: 'Immediately', text: 'Thank you for choosing us!' },
      { type: 'wait', delay: '1 day', text: 'Wait 1 day' },
      { type: 'sms', delay: 'Then', text: 'Follow-up SMS for review' }
    ]
  },
  {
    id: 'invoice-paid-thanks',
    name: 'Invoice Paid → Thank You',
    description: 'Send immediate thank you email when invoice is paid',
    icon: Mail,
    color: 'bg-blue-500',
    trigger: 'invoice_paid',
    steps: 1,
    channels: ['email'],
    time: 'Immediately',
    popular: true,
    preview: [
      { type: 'email', delay: 'Immediately', text: 'Thank you for payment!' }
    ]
  },
  {
    id: 'follow-up-series',
    name: 'Follow-Up Series',
    description: 'Multi-step follow-up: Email → Wait → SMS → Email',
    icon: Rocket,
    color: 'bg-purple-500',
    trigger: 'manual',
    steps: 4,
    channels: ['email', 'sms'],
    time: '1 week',
    popular: false,
    preview: [
      { type: 'email', delay: 'Day 1', text: 'Initial email' },
      { type: 'wait', delay: '2 days', text: 'Wait' },
      { type: 'sms', delay: 'Day 3', text: 'SMS follow-up' },
      { type: 'wait', delay: '3 days', text: 'Wait' },
      { type: 'email', delay: 'Day 6', text: 'Final email' }
    ]
  },
  {
    id: 'welcome-series',
    name: 'Welcome Series',
    description: 'Welcome new customers with a 3-email sequence',
    icon: Sparkles,
    color: 'bg-yellow-500',
    trigger: 'customer_created',
    steps: 3,
    channels: ['email'],
    time: '1 week',
    popular: false,
    preview: [
      { type: 'email', delay: 'Day 1', text: 'Welcome email' },
      { type: 'wait', delay: '2 days', text: 'Wait' },
      { type: 'email', delay: 'Day 3', text: 'Getting started guide' },
      { type: 'wait', delay: '3 days', text: 'Wait' },
      { type: 'email', delay: 'Day 6', text: 'How can we help?' }
    ]
  },
  {
    id: 'service-reminder',
    name: 'Service Reminder',
    description: 'Send SMS reminder before scheduled service',
    icon: MessageSquare,
    color: 'bg-teal-500',
    trigger: 'manual',
    steps: 1,
    channels: ['sms'],
    time: '24h before',
    popular: false,
    preview: [
      { type: 'sms', delay: '24h before', text: 'Service reminder SMS' }
    ]
  },
  {
    id: 'review-request-simple',
    name: 'Review Request (Simple)',
    description: 'Single email asking for a review',
    icon: Zap,
    color: 'bg-orange-500',
    trigger: 'manual',
    steps: 1,
    channels: ['email'],
    time: 'Immediately',
    popular: true,
    preview: [
      { type: 'email', delay: 'Immediately', text: 'Please leave us a review' }
    ]
  }
];

const JourneyTemplatesModal = ({ isOpen, onClose, onSelectTemplate, onCreateBlank }) => {
  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-3 h-3" />;
      case 'sms':
        return <MessageSquare className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStepIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-3 h-3 text-blue-500" />;
      case 'sms':
        return <MessageSquare className="w-3 h-3 text-green-500" />;
      case 'wait':
        return <Clock className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Choose a Journey Template
          </DialogTitle>
          <DialogDescription className="text-base">
            Start with a pre-built template or create from scratch. You can customize everything later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Popular Templates */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Popular Templates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {JOURNEY_TEMPLATES.filter(t => t.popular).map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="relative border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${template.color} bg-opacity-10`}>
                          <Icon className={`w-5 h-5 ${template.color.replace('bg-', 'text-')}`} />
                        </div>
                        {template.popular && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">Popular</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold mt-2 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Preview Flow */}
                      <div className="space-y-2 mb-4">
                        {template.preview.slice(0, 3).map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              {getStepIcon(step.type)}
                              <span className="font-medium">{step.delay}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{step.text}</span>
                          </div>
                        ))}
                        {template.preview.length > 3 && (
                          <div className="text-xs text-gray-500 italic">
                            +{template.preview.length - 3} more steps
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{template.steps} steps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.channels.map(ch => (
                            <span key={ch} className="flex items-center gap-1">
                              {getChannelIcon(ch)}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{template.time}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template);
                        }}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* All Templates */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">All Templates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {JOURNEY_TEMPLATES.filter(t => !t.popular).map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="relative border-2 border-transparent hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${template.color} bg-opacity-10`}>
                          <Icon className={`w-5 h-5 ${template.color.replace('bg-', 'text-')}`} />
                        </div>
                      </div>
                      <CardTitle className="text-base font-semibold mt-2 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Preview Flow */}
                      <div className="space-y-2 mb-4">
                        {template.preview.slice(0, 3).map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              {getStepIcon(step.type)}
                              <span className="font-medium">{step.delay}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{step.text}</span>
                          </div>
                        ))}
                        {template.preview.length > 3 && (
                          <div className="text-xs text-gray-500 italic">
                            +{template.preview.length - 3} more steps
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{template.steps} steps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.channels.map(ch => (
                            <span key={ch} className="flex items-center gap-1">
                              {getChannelIcon(ch)}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{template.time}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template);
                        }}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Create Blank Option */}
          <div className="pt-6 border-t">
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Create from Scratch
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Build a completely custom journey with full control
                  </p>
                  <Button
                    variant="outline"
                    className="border-2"
                    onClick={onCreateBlank}
                  >
                    Start Building
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JourneyTemplatesModal;


