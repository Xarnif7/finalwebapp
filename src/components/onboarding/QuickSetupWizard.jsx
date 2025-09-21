import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, X, MapPin, Clock, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/browser';
import { toast } from 'react-hot-toast';

// Step Components
import IndustryStep from './steps/IndustryStep';
import ServiceAreaStep from './steps/ServiceAreaStep';
import AutomationsStep from './steps/AutomationsStep';

const QuickSetupWizard = ({ isOpen, onClose, onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [wizardData, setWizardData] = useState({
    industry: 'plumbing',
    serviceArea: {
      radius: 20,
      zipCodes: [],
      customZips: []
    },
    automations: {
      emergencyTemplates: true,
      scheduledTemplates: true,
      sequences: {
        newJob: true,
        followUps: true,
        npsRecovery: true
      },
      defaultChannel: 'sms'
    }
  });

  const steps = [
    { id: 1, title: 'Industry', icon: Settings, description: 'Select your home service type' },
    { id: 2, title: 'Service Area', icon: MapPin, description: 'Define your coverage area' },
    { id: 3, title: 'Automations', icon: MessageSquare, description: 'Set up review sequences' }
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save wizard data to database
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
      // Update business with industry and service area
      await supabase
        .from('businesses')
        .update({
          industry: wizardData.industry,
          service_area: wizardData.serviceArea,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.business_id);

      // Mark user as having completed quick setup
      await supabase
        .from('profiles')
        .update({
          quick_setup_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

        // Create default templates based on industry
        await createIndustryTemplates(profile.business_id, wizardData.industry);
        
        // Create default sequences
        await createDefaultSequences(profile.business_id, wizardData.automations, wizardData.industry);
      }

      toast.success('Quick setup completed! Your automations are ready to go.');
      onComplete?.(wizardData);
      onClose();
    } catch (error) {
      console.error('Error completing setup:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createIndustryTemplates = async (businessId, industry) => {
    const templates = getIndustryTemplates(industry);
    
    for (const template of templates) {
      await supabase
        .from('templates')
        .insert({
          business_id: businessId,
          kind: template.kind,
          subject: template.subject,
          body: template.body,
          template_type: template.template_type,
          is_default: true
        });
    }
  };

  const createDefaultSequences = async (businessId, automations, industry) => {
    const sequences = getDefaultSequences(automations, industry);
    
    for (const sequence of sequences) {
      await supabase
        .from('automation_sequences')
        .insert({
          business_id: businessId,
          name: sequence.name,
          description: sequence.description,
          steps: sequence.steps,
          is_active: true,
          is_default: true
        });
    }
  };

  const getIndustryTemplates = (industry) => {
    const baseTemplates = {
      plumbing: [
        {
          kind: 'email',
          subject: 'How was your plumbing service?',
          body: 'Hi {customer.name},\n\nThank you for choosing {company_name} for your plumbing needs! We hope your service met your expectations.\n\nIf you have a moment, we\'d greatly appreciate a quick review: {review_link}\n\nYour feedback helps us serve you better!\n\nBest regards,\n{company_name}',
          template_type: 'scheduled'
        },
        {
          kind: 'sms',
          body: 'Hi {customer.name}! Thanks for choosing {company_name}. How was your plumbing service? We\'d love your feedback: {review_link}',
          template_type: 'scheduled'
        }
      ],
      hvac: [
        {
          kind: 'email',
          subject: 'How is your HVAC system performing?',
          body: 'Hi {customer.name},\n\nThank you for trusting {company_name} with your heating and cooling needs! We hope your system is working perfectly.\n\nPlease take a moment to share your experience: {review_link}\n\nYour review helps other homeowners find quality HVAC service!\n\nBest regards,\n{company_name}',
          template_type: 'scheduled'
        },
        {
          kind: 'sms',
          body: 'Hi {customer.name}! Thanks for choosing {company_name}. How is your HVAC system? We\'d love your feedback: {review_link}',
          template_type: 'scheduled'
        }
      ],
      electrical: [
        {
          kind: 'email',
          subject: 'How was your electrical service?',
          body: 'Hi {customer.name},\n\nThank you for choosing {company_name} for your electrical needs! We hope your service was completed safely and efficiently.\n\nIf you have a moment, we\'d appreciate a quick review: {review_link}\n\nYour feedback helps us maintain our high standards!\n\nBest regards,\n{company_name}',
          template_type: 'scheduled'
        },
        {
          kind: 'sms',
          body: 'Hi {customer.name}! Thanks for choosing {company_name}. How was your electrical service? We\'d love your feedback: {review_link}',
          template_type: 'scheduled'
        }
      ],
      solar: [
        {
          kind: 'email',
          subject: 'How is your new solar system performing?',
          body: 'Hi {customer.name},\n\nThank you for choosing {company_name} for your solar installation! We hope your system is generating clean energy as expected.\n\nPlease share your experience with other homeowners: {review_link}\n\nYour review helps others make informed decisions about solar!\n\nBest regards,\n{company_name}',
          template_type: 'scheduled'
        },
        {
          kind: 'sms',
          body: 'Hi {customer.name}! Thanks for choosing {company_name}. How is your solar system? We\'d love your feedback: {review_link}',
          template_type: 'scheduled'
        }
      ]
    };

    return baseTemplates[industry] || baseTemplates.plumbing;
  };

  const getDefaultSequences = (automations, industry) => {
    const industrySequences = {
      plumbing: {
        newJob: 'Plumbing Service Complete',
        followUp: 'Plumbing Follow-up',
        maintenance: 'Plumbing Maintenance Reminder'
      },
      hvac: {
        newJob: 'HVAC Service Complete',
        followUp: 'HVAC System Check',
        maintenance: 'Seasonal HVAC Maintenance'
      },
      electrical: {
        newJob: 'Electrical Service Complete',
        followUp: 'Electrical Follow-up',
        maintenance: 'Electrical Safety Check'
      },
      solar: {
        newJob: 'Solar Installation Complete',
        followUp: 'Solar Performance Check',
        maintenance: 'Solar System Maintenance'
      }
    };

    const industryNames = industrySequences[industry] || industrySequences.plumbing;

    return [
      {
        name: industryNames.newJob,
        description: 'Automated review request after service completion',
        steps: [
          { delay: '2 hours', action: 'send_review_request', channel: automations.defaultChannel },
          { delay: '24 hours', action: 'follow_up_if_no_response', channel: automations.defaultChannel },
          { delay: '1 week', action: 'final_follow_up', channel: automations.defaultChannel }
        ]
      },
      {
        name: industryNames.followUp,
        description: 'Regular check-ins with existing customers',
        steps: [
          { delay: '3 months', action: 'maintenance_reminder', channel: 'email' },
          { delay: '6 months', action: 'seasonal_check_in', channel: 'email' },
          { delay: '1 year', action: 'anniversary_review_request', channel: 'email' }
        ]
      },
      {
        name: industryNames.maintenance,
        description: 'Handle negative feedback and recovery',
        steps: [
          { delay: 'immediate', action: 'acknowledge_feedback', channel: 'email' },
          { delay: '24 hours', action: 'follow_up_call', channel: 'phone' },
          { delay: '1 week', action: 'resolution_check', channel: 'email' }
        ]
      }
    ];
  };

  const updateWizardData = (stepData) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <IndustryStep data={wizardData} onUpdate={updateWizardData} />;
      case 2:
        return <ServiceAreaStep data={wizardData} onUpdate={updateWizardData} />;
      case 3:
        return <AutomationsStep data={wizardData} onUpdate={updateWizardData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Quick Setup</DialogTitle>
              <p className="text-gray-600 mt-1">
                Quick Setup configures Blipp for your trade in under two minutes. We detect your service area from your address, generate proven emergency and scheduled templates, and activate email/SMS with smart defaults. You can tweak everything later.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 mx-4 text-gray-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Skip Setup
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.open('/automated-requests', '_blank')}>
              Expand to Full Setup
            </Button>
            <Button 
              onClick={handleNext}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : currentStep === 3 ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {currentStep === 3 ? 'Complete Setup' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSetupWizard;
