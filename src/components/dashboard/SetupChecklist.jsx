import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, Settings, Users, MessageSquare, MapPin, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/browser';

const SetupChecklist = ({ onQuickSetup, onDismiss }) => {
  const { user } = useAuth();
  const [setupStatus, setSetupStatus] = useState({
    businessProfile: false,
    customers: false,
    templates: false,
    serviceArea: false,
    automations: false,
    integrations: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSetupStatus();
  }, []);

  const loadSetupStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        // Check business profile completion
        const { data: business } = await supabase
          .from('businesses')
          .select('name, address, phone, email, industry, service_area')
          .eq('id', profile.business_id)
          .single();

        // Check customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('business_id', profile.business_id);

        // Check templates
        const { data: templates } = await supabase
          .from('templates')
          .select('id')
          .eq('business_id', profile.business_id);

        // Check automations
        const { data: sequences } = await supabase
          .from('automation_sequences')
          .select('id')
          .eq('business_id', profile.business_id);

        // Check integrations (Google My Business)
        const { data: integrations } = await supabase
          .from('integrations')
          .select('id')
          .eq('business_id', profile.business_id)
          .eq('platform', 'google_my_business');

        setSetupStatus({
          businessProfile: !!(business?.name && business?.address && business?.phone),
          customers: customers && customers.length > 0,
          templates: templates && templates.length > 0,
          serviceArea: !!(business?.service_area && Object.keys(business.service_area).length > 0),
          automations: sequences && sequences.length > 0,
          integrations: integrations && integrations.length > 0
        });
      }
    } catch (error) {
      console.error('Error loading setup status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checklistItems = [
    {
      id: 'businessProfile',
      title: 'Business Profile',
      description: 'Complete your business information',
      icon: Settings,
      link: createPageUrl('Settings'),
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'customers',
      title: 'Customer Database',
      description: 'Add your customer contacts',
      icon: Users,
      link: createPageUrl('Clients'),
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      id: 'templates',
      title: 'Review Templates',
      description: 'Customize your messaging',
      icon: MessageSquare,
      link: createPageUrl('AutomatedRequests'),
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      id: 'serviceArea',
      title: 'Service Area',
      description: 'Define your coverage zones',
      icon: MapPin,
      link: createPageUrl('Settings'),
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      id: 'automations',
      title: 'Automation Sequences',
      description: 'Set up review workflows',
      icon: Zap,
      link: createPageUrl('AutomatedRequests'),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      id: 'integrations',
      title: 'Google My Business',
      description: 'Connect your review platform',
      icon: Settings,
      link: createPageUrl('Integrations'),
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  ];

  const completedCount = Object.values(setupStatus).filter(Boolean).length;
  const totalCount = checklistItems.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if all items are completed
  if (completedCount === totalCount) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Setup Progress
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Complete your setup to unlock all features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {completedCount}/{totalCount} Complete
            </Badge>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              ×
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checklistItems.map((item) => {
            const Icon = item.icon;
            const isCompleted = setupStatus[item.id];
            
            return (
              <Link
                key={item.id}
                to={item.link}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200 hover:border-green-300' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100' : item.bg}`}>
                    <Icon className={`w-5 h-5 ${isCompleted ? 'text-green-600' : item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <h3 className={`font-medium ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                        {item.title}
                      </h3>
                    </div>
                    <p className={`text-sm mt-1 ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Quick Setup CTA */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Need help getting started?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Use our Quick Setup wizard to configure everything in under 2 minutes
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Switch to full setup page without losing progress
                  window.open('/automated-requests', '_blank');
                }}
              >
                Full Setup
              </Button>
              <Button 
                size="sm" 
                onClick={onQuickSetup}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Setup
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupChecklist;
