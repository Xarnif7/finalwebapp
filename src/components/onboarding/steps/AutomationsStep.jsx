import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, AlertTriangle, CheckCircle, Smartphone, Mail } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/browser';

const AutomationsStep = ({ data, onUpdate }) => {
  const { user } = useAuth();
  const [customerContactInfo, setCustomerContactInfo] = useState({ hasEmail: false, hasPhone: false });
  const [previewTemplates, setPreviewTemplates] = useState({});

  useEffect(() => {
    loadCustomerContactInfo();
    generatePreviewTemplates();
  }, [data.industry]);

  const loadCustomerContactInfo = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        const { data: customers } = await supabase
          .from('customers')
          .select('email, phone')
          .eq('business_id', profile.business_id)
          .limit(10);

        if (customers && customers.length > 0) {
          const hasEmail = customers.some(c => c.email && c.email.trim() !== '');
          const hasPhone = customers.some(c => c.phone && c.phone.trim() !== '');
          setCustomerContactInfo({ hasEmail, hasPhone });
          
          // Auto-select channel based on available contact info
          if (hasPhone && !hasEmail) {
            onUpdate({
              automations: {
                ...data.automations,
                defaultChannel: 'sms'
              }
            });
          } else if (hasEmail && !hasPhone) {
            onUpdate({
              automations: {
                ...data.automations,
                defaultChannel: 'email'
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading customer contact info:', error);
    }
  };

  const generatePreviewTemplates = () => {
    const industryTemplates = {
      plumbing: {
        emergency: {
          sms: "🚨 URGENT: {customer.name}, your plumbing emergency has been resolved! Please rate our service: {review_link}",
          email: "Subject: Emergency Plumbing Service Complete\n\nHi {customer.name},\n\nYour plumbing emergency has been resolved! We hope we were able to help quickly and efficiently.\n\nPlease take a moment to rate our emergency service: {review_link}\n\nThank you for trusting us in your time of need!\n\n{company_name}"
        },
        scheduled: {
          sms: "Hi {customer.name}! Thanks for choosing {company_name}. How was your plumbing service? We'd love your feedback: {review_link}",
          email: "Subject: How was your plumbing service?\n\nHi {customer.name},\n\nThank you for choosing {company_name} for your plumbing needs! We hope your service met your expectations.\n\nIf you have a moment, we'd greatly appreciate a quick review: {review_link}\n\nYour feedback helps us serve you better!\n\nBest regards,\n{company_name}"
        },
        followUp: {
          sms: "Hi {customer.name}! It's been a week since our plumbing service. Everything working well? We'd love your review: {review_link}",
          email: "Subject: Follow-up on your plumbing service\n\nHi {customer.name},\n\nIt's been a week since we completed your plumbing service. We hope everything is working perfectly!\n\nIf you're satisfied with our work, we'd greatly appreciate a quick review: {review_link}\n\nThank you for choosing {company_name}!\n\nBest regards,\n{company_name}"
        }
      },
      hvac: {
        emergency: {
          sms: "🚨 URGENT: {customer.name}, your HVAC emergency has been resolved! Please rate our service: {review_link}",
          email: "Subject: Emergency HVAC Service Complete\n\nHi {customer.name},\n\nYour HVAC emergency has been resolved! We hope your system is working properly now.\n\nPlease rate our emergency service: {review_link}\n\nThank you for trusting us!\n\n{company_name}"
        },
        scheduled: {
          sms: "Hi {customer.name}! Thanks for choosing {company_name}. How is your HVAC system? We'd love your feedback: {review_link}",
          email: "Subject: How is your HVAC system performing?\n\nHi {customer.name},\n\nThank you for trusting {company_name} with your heating and cooling needs! We hope your system is working perfectly.\n\nPlease take a moment to share your experience: {review_link}\n\nYour review helps other homeowners find quality HVAC service!\n\nBest regards,\n{company_name}"
        },
        followUp: {
          sms: "Hi {customer.name}! It's been a week since our HVAC service. How's your system running? We'd love your review: {review_link}",
          email: "Subject: Follow-up on your HVAC service\n\nHi {customer.name},\n\nIt's been a week since we completed your HVAC service. We hope your system is running efficiently!\n\nIf you're satisfied with our work, we'd greatly appreciate a quick review: {review_link}\n\nThank you for choosing {company_name}!\n\nBest regards,\n{company_name}"
        }
      },
      electrical: {
        emergency: {
          sms: "🚨 URGENT: {customer.name}, your electrical emergency has been resolved! Please rate our service: {review_link}",
          email: "Subject: Emergency Electrical Service Complete\n\nHi {customer.name},\n\nYour electrical emergency has been resolved! We hope everything is working safely now.\n\nPlease rate our emergency service: {review_link}\n\nThank you for trusting us!\n\n{company_name}"
        },
        scheduled: {
          sms: "Hi {customer.name}! Thanks for choosing {company_name}. How was your electrical service? We'd love your feedback: {review_link}",
          email: "Subject: How was your electrical service?\n\nHi {customer.name},\n\nThank you for choosing {company_name} for your electrical needs! We hope your service was completed safely and efficiently.\n\nIf you have a moment, we'd appreciate a quick review: {review_link}\n\nYour feedback helps us maintain our high standards!\n\nBest regards,\n{company_name}"
        },
        followUp: {
          sms: "Hi {customer.name}! It's been a week since our electrical service. Everything working well? We'd love your review: {review_link}",
          email: "Subject: Follow-up on your electrical service\n\nHi {customer.name},\n\nIt's been a week since we completed your electrical service. We hope everything is working safely and efficiently!\n\nIf you're satisfied with our work, we'd greatly appreciate a quick review: {review_link}\n\nThank you for choosing {company_name}!\n\nBest regards,\n{company_name}"
        }
      },
      solar: {
        emergency: {
          sms: "🚨 URGENT: {customer.name}, your solar system issue has been resolved! Please rate our service: {review_link}",
          email: "Subject: Solar System Issue Resolved\n\nHi {customer.name},\n\nYour solar system issue has been resolved! We hope your system is generating clean energy again.\n\nPlease rate our service: {review_link}\n\nThank you for trusting us!\n\n{company_name}"
        },
        scheduled: {
          sms: "Hi {customer.name}! Thanks for choosing {company_name}. How is your solar system? We'd love your feedback: {review_link}",
          email: "Subject: How is your new solar system performing?\n\nHi {customer.name},\n\nThank you for choosing {company_name} for your solar installation! We hope your system is generating clean energy as expected.\n\nPlease share your experience with other homeowners: {review_link}\n\nYour review helps others make informed decisions about solar!\n\nBest regards,\n{company_name}"
        },
        followUp: {
          sms: "Hi {customer.name}! It's been a week since your solar installation. How's it performing? We'd love your review: {review_link}",
          email: "Subject: Follow-up on your solar installation\n\nHi {customer.name},\n\nIt's been a week since we completed your solar installation. We hope your system is generating clean energy as expected!\n\nIf you're satisfied with our work, we'd greatly appreciate a quick review: {review_link}\n\nThank you for choosing {company_name}!\n\nBest regards,\n{company_name}"
        }
      }
    };

    setPreviewTemplates(industryTemplates[data.industry] || industryTemplates.plumbing);
  };

  const handleTemplateToggle = (templateType, enabled) => {
    onUpdate({
      automations: {
        ...data.automations,
        [templateType]: enabled
      }
    });
  };

  const handleSequenceToggle = (sequenceType, enabled) => {
    onUpdate({
      automations: {
        ...data.automations,
        sequences: {
          ...data.automations.sequences,
          [sequenceType]: enabled
        }
      }
    });
  };

  const handleChannelChange = (channel) => {
    onUpdate({
      automations: {
        ...data.automations,
        defaultChannel: channel
      }
    });
  };

  const sequences = [
    {
      id: 'newJob',
      name: 'New Job Sequence',
      description: 'Automated review request after service completion',
      steps: [
        { delay: '2 hours', action: 'Send review request', channel: data.automations.defaultChannel },
        { delay: '24 hours', action: 'Follow up if no response', channel: data.automations.defaultChannel },
        { delay: '1 week', action: 'Final follow up', channel: data.automations.defaultChannel }
      ]
    },
    {
      id: 'followUps',
      name: 'Follow-Up Sequence',
      description: 'Regular check-ins with existing customers',
      steps: [
        { delay: '3 months', action: 'Maintenance reminder', channel: 'email' },
        { delay: '6 months', action: 'Seasonal check-in', channel: 'email' },
        { delay: '1 year', action: 'Anniversary review request', channel: 'email' }
      ]
    },
    {
      id: 'npsRecovery',
      name: 'NPS Recovery',
      description: 'Handle negative feedback and recovery',
      steps: [
        { delay: 'Immediate', action: 'Acknowledge feedback', channel: 'email' },
        { delay: '24 hours', action: 'Follow up call', channel: 'phone' },
        { delay: '1 week', action: 'Resolution check', channel: 'email' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Set up your automations</h3>
        <p className="text-gray-600">Choose your templates and sequences to automate review requests</p>
      </div>

      {/* Default Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Default Communication Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Preferred channel for review requests:</Label>
              <div className="flex gap-2">
                <Button
                  variant={data.automations.defaultChannel === 'sms' ? 'default' : 'outline'}
                  onClick={() => handleChannelChange('sms')}
                  disabled={!customerContactInfo.hasPhone}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  SMS
                  {!customerContactInfo.hasPhone && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      No phone numbers
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={data.automations.defaultChannel === 'email' ? 'default' : 'outline'}
                  onClick={() => handleChannelChange('email')}
                  disabled={!customerContactInfo.hasEmail}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email
                  {!customerContactInfo.hasEmail && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      No email addresses
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Based on your customer data, we recommend {data.automations.defaultChannel === 'sms' ? 'SMS' : 'Email'} as your primary channel
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Types */}
      <Card>
        <CardHeader>
          <CardTitle>Review Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emergency Templates */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <Label className="text-base font-medium">Emergency Service Templates</Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                For urgent calls and after-hours service
              </p>
            </div>
            <Switch
              checked={data.automations.emergencyTemplates}
              onCheckedChange={(checked) => handleTemplateToggle('emergencyTemplates', checked)}
            />
          </div>

          {/* Scheduled Templates */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <Label className="text-base font-medium">Scheduled Service Templates</Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                For regular appointments and maintenance
              </p>
            </div>
            <Switch
              checked={data.automations.scheduledTemplates}
              onCheckedChange={(checked) => handleTemplateToggle('scheduledTemplates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Previews */}
      {(data.automations.emergencyTemplates || data.automations.scheduledTemplates) && (
        <Card>
          <CardHeader>
            <CardTitle>Template Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.automations.emergencyTemplates && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Emergency Template ({data.automations.defaultChannel.toUpperCase()})</h4>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {previewTemplates.emergency?.[data.automations.defaultChannel] || 'Template preview not available'}
                  </p>
                </div>
              </div>
            )}
            
            {data.automations.scheduledTemplates && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Scheduled Template ({data.automations.defaultChannel.toUpperCase()})</h4>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {previewTemplates.scheduled?.[data.automations.defaultChannel] || 'Template preview not available'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automation Sequences */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Sequences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sequences.map((sequence) => (
            <div key={sequence.id} className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <Label className="text-base font-medium">{sequence.name}</Label>
                </div>
                <p className="text-sm text-gray-600 mt-1">{sequence.description}</p>
                <div className="mt-2 space-y-1">
                  {sequence.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{step.delay}: {step.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {step.channel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <Switch
                checked={data.automations.sequences[sequence.id]}
                onCheckedChange={(checked) => handleSequenceToggle(sequence.id, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900">Automations configured!</h4>
              <p className="text-sm text-green-700">
                {data.automations.emergencyTemplates && data.automations.scheduledTemplates ? 'Both' : 
                 data.automations.emergencyTemplates ? 'Emergency' : 'Scheduled'} templates enabled, 
                {Object.values(data.automations.sequences).filter(Boolean).length} sequences active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationsStep;
