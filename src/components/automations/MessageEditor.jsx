import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Star } from 'lucide-react';

// Message Templates Library - Pre-built messages for each purpose and channel
export const MESSAGE_TEMPLATES = {
  thank_you: {
    name: 'Thank You / Confirmation',
    icon: '🙏',
    email: {
      subject: "Thank you for choosing {{business.name}}! 🙏",
      body: "Hi {{customer.name}},\n\nThank you for your business! We hope you had a great experience with our service.\n\nIf you have any questions or need anything, please don't hesitate to reach out. We're here to help!\n\nBest regards,\nThe {{business.name}} Team"
    },
    sms: {
      body: "Hi {{customer.name}}, thank you for choosing {{business.name}}! We appreciate your business. 🙏"
    }
  },
  follow_up: {
    name: 'Post-Service Follow-up',
    icon: '💬',
    email: {
      subject: "How did everything go? 😊",
      body: "Hi {{customer.name}},\n\nWe wanted to check in and make sure everything went smoothly with your recent service.\n\nYour feedback is important to us! If there's anything we can improve or if you have any concerns, please let us know.\n\nWe're here to help!\n\nBest,\n{{business.name}}"
    },
    sms: {
      body: "Hi {{customer.name}}, just checking in! How did everything go with your service? Let us know if you need anything. 😊"
    }
  },
  review_request: {
    name: 'Review Request',
    icon: '⭐',
    email: {
      subject: "We'd love your feedback! ⭐",
      body: "Hi {{customer.name}},\n\nWe hope you loved your experience with {{business.name}}!\n\nYour feedback helps us improve and helps other customers make informed decisions. Would you mind taking 30 seconds to leave us a review?\n\n👉 Leave a review here: {{review_link}}\n\nThank you so much for your support!\n\n{{business.name}}"
    },
    sms: {
      body: "Hi {{customer.name}}, we'd love your feedback! 🌟 Leave us a quick review here: {{review_link}} Thank you!"
    }
  },
  rebooking: {
    name: 'Rebooking / Reschedule Prompt',
    icon: '📅',
    email: {
      subject: "Ready to book your next appointment? 📅",
      body: "Hi {{customer.name}},\n\nIt's been a while since your last service with us! We'd love to see you again and help you with {{service.type}}.\n\nClick here to schedule your next appointment:\n👉 {{booking_link}}\n\nOr call us at {{business.phone}} and we'll get you scheduled right away.\n\nLooking forward to serving you again!\n{{business.name}}"
    },
    sms: {
      body: "Hi {{customer.name}}, ready to book your next appointment? 📅 Schedule here: {{booking_link}} or call {{business.phone}}"
    }
  },
  retention: {
    name: 'Customer Retention / Win-back',
    icon: '💙',
    email: {
      subject: "We miss you! Come back for 15% off 💙",
      body: "Hi {{customer.name}},\n\nWe noticed it's been a while since we last saw you. We miss having you as a customer!\n\nAs a special thank you, we're offering you 15% off your next service. Just use code WELCOME15 when you book.\n\n👉 Book now: {{booking_link}}\n\nWe can't wait to serve you again!\n\nBest,\n{{business.name}}"
    },
    sms: {
      body: "Hi {{customer.name}}, we miss you! 💙 Come back for 15% off with code WELCOME15. Book here: {{booking_link}}"
    }
  },
  upsell: {
    name: 'Upsell / Promotion',
    icon: '🎯',
    email: {
      subject: "Special offer just for you! 🎯",
      body: "Hi {{customer.name}},\n\nBecause you're a valued customer, we wanted to share this exclusive offer with you:\n\n✨ {{offer.description}} ✨\n\nThis limited-time offer won't last long, so act fast!\n\n👉 Learn more: {{offer_link}}\n\nQuestions? Just reply to this email or call us at {{business.phone}}.\n\nThank you for being an amazing customer!\n{{business.name}}"
    },
    sms: {
      body: "{{customer.name}}, exclusive offer for you! 🎯 {{offer.description}} Learn more: {{offer_link}}"
    }
  },
  custom: {
    name: 'Custom Message',
    icon: '✏️',
    email: {
      subject: "Message from {{business.name}}",
      body: "Hi {{customer.name}},\n\n[Write your custom message here]\n\nBest regards,\n{{business.name}}"
    },
    sms: {
      body: "Hi {{customer.name}}, [your custom message]"
    }
  }
};

/**
 * Per-Step Message Editor Component
 * Shows a message editor for each communication step in the journey
 */
const PerStepMessageEditor = ({ flowSteps, updateFlowStepMessage, loadTemplateForStep, toast }) => {
  // Filter out trigger and wait steps - only show email/sms steps  
  const communicationSteps = flowSteps.filter(step => 
    step.type === 'email' || step.type === 'sms' || step.type === 'send_email' || step.type === 'send_sms'
  );

  if (communicationSteps.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No message steps in your flow yet.</p>
        <p className="text-sm text-gray-500 mt-1">Go back to Step 2 and add Email or SMS steps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {communicationSteps.map((step, index) => {
        const stepType = step.type === 'send_email' ? 'email' : step.type === 'send_sms' ? 'sms' : step.type;
        const isEmail = stepType === 'email';
        const isSMS = stepType === 'sms';
        const StepIcon = isEmail ? Mail : MessageSquare;
        const borderColor = isEmail ? 'border-blue-200' : 'border-green-200';
        const bgGradient = isEmail ? 'from-blue-50 to-white' : 'from-green-50 to-white';
        const iconBg = isEmail ? 'bg-blue-100' : 'bg-green-100';
        const iconColor = isEmail ? 'text-blue-600' : 'text-green-600';

        // Get current message data or initialize
        const currentMessage = step.message || {};
        const currentPurpose = currentMessage.purpose || 'custom';

        return (
          <div key={step.id} className={`rounded-xl border-2 ${borderColor} bg-gradient-to-br ${bgGradient} shadow-lg p-5 space-y-4`}>
            {/* Step Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${iconBg} rounded-lg`}>
                  <StepIcon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {isEmail ? '📨 Email' : '💬 SMS'} - Step {index + 1}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {MESSAGE_TEMPLATES[currentPurpose]?.name || 'Custom Message'}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Purpose Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">What is this message for?</Label>
              <Select
                value={currentPurpose}
                onValueChange={(value) => {
                  // Update the step with new purpose (don't load template yet)
                  updateFlowStepMessage(step.id, { purpose: value });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      <span>{template.icon} {template.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Load Template Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTemplateForStep(step.id, stepType, currentPurpose)}
                className="w-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Load {MESSAGE_TEMPLATES[currentPurpose]?.name} Template
              </Button>
            </div>

            {/* Email Fields */}
            {isEmail && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Subject Line</Label>
                  <Input
                    value={currentMessage.subject || ''}
                    onChange={(e) => updateFlowStepMessage(step.id, { subject: e.target.value })}
                    placeholder="e.g., Thank you {{customer.name}}!"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Message Body</Label>
                  <Textarea
                    rows={6}
                    value={currentMessage.body || ''}
                    onChange={(e) => updateFlowStepMessage(step.id, { body: e.target.value })}
                    placeholder="Write your email message here..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* SMS Fields */}
            {isSMS && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">SMS Message (160 characters recommended)</Label>
                  <Textarea
                    rows={4}
                    maxLength={320}
                    value={currentMessage.body || ''}
                    onChange={(e) => updateFlowStepMessage(step.id, { body: e.target.value })}
                    placeholder="Write your SMS message here..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(currentMessage.body || '').length} / 320 characters
                  </p>
                </div>
              </div>
            )}

            {/* Available Variables */}
            <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                <code className="px-2 py-1 bg-white rounded text-xs border">{'{{customer.name}}'}</code>
                <code className="px-2 py-1 bg-white rounded text-xs border">{'{{business.name}}'}</code>
                <code className="px-2 py-1 bg-white rounded text-xs border">{'{{business.phone}}'}</code>
                {['review_request', 'rebooking', 'retention'].includes(currentPurpose) && (
                  <>
                    <code className="px-2 py-1 bg-white rounded text-xs border">{'{{review_link}}'}</code>
                    <code className="px-2 py-1 bg-white rounded text-xs border">{'{{booking_link}}'}</code>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PerStepMessageEditor;

