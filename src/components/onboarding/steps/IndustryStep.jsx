import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Thermometer, Zap, Sun, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/browser';

const IndustryStep = ({ data, onUpdate }) => {
  const { user } = useAuth();
  const [businessInfo, setBusinessInfo] = useState({ name: '', email: '' });
  const [inferredIndustry, setInferredIndustry] = useState(null);

  useEffect(() => {
    loadBusinessInfo();
    inferIndustryFromUser();
  }, []);

  const loadBusinessInfo = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('name, email')
          .eq('id', profile.business_id)
          .single();

        if (business) {
          setBusinessInfo({
            name: business.name || '',
            email: business.email || user.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading business info:', error);
    }
  };

  const inferIndustryFromUser = () => {
    // Infer industry from user email domain or business name
    const email = user?.email || '';
    const businessName = businessInfo.name.toLowerCase();
    
    // Check for industry keywords in email domain or business name
    if (email.includes('plumb') || businessName.includes('plumb') || businessName.includes('pipe')) {
      setInferredIndustry('plumbing');
    } else if (email.includes('hvac') || businessName.includes('hvac') || businessName.includes('heating') || businessName.includes('cooling')) {
      setInferredIndustry('hvac');
    } else if (email.includes('electric') || businessName.includes('electric') || businessName.includes('electrical')) {
      setInferredIndustry('electrical');
    } else if (email.includes('solar') || businessName.includes('solar') || businessName.includes('renewable')) {
      setInferredIndustry('solar');
    } else {
      setInferredIndustry('plumbing'); // Default to plumbing
    }
  };

  useEffect(() => {
    if (inferredIndustry && !data.industry) {
      onUpdate({ industry: inferredIndustry });
    }
  }, [inferredIndustry, data.industry, onUpdate]);
  const industries = [
    {
      id: 'plumbing',
      name: 'Plumbing',
      icon: Wrench,
      description: 'Pipe repairs, installations, maintenance',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      templates: ['Emergency calls', 'Scheduled repairs', 'Maintenance reminders']
    },
    {
      id: 'hvac',
      name: 'HVAC',
      icon: Thermometer,
      description: 'Heating, cooling, ventilation systems',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      templates: ['System maintenance', 'Seasonal check-ups', 'Emergency repairs']
    },
    {
      id: 'electrical',
      name: 'Electrical',
      icon: Zap,
      description: 'Wiring, outlets, electrical systems',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      templates: ['Safety inspections', 'Installations', 'Emergency repairs']
    },
    {
      id: 'solar',
      name: 'Solar',
      icon: Sun,
      description: 'Solar panel installation and maintenance',
      color: 'bg-green-100 text-green-800 border-green-200',
      templates: ['Installation follow-up', 'Performance checks', 'Maintenance reminders']
    },
    {
      id: 'other',
      name: 'Other',
      icon: Settings,
      description: 'Roofing, landscaping, general contracting',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      templates: ['Project completion', 'Follow-up services', 'Maintenance']
    }
  ];

  const handleIndustrySelect = (industryId) => {
    onUpdate({ industry: industryId });
  };

  const selectedIndustry = industries.find(ind => ind.id === data.industry);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">What type of home service do you provide?</h3>
        <p className="text-gray-600">This helps us customize your review templates and automation sequences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {industries.map((industry) => {
          const Icon = industry.icon;
          const isSelected = data.industry === industry.id;
          
          return (
            <Card 
              key={industry.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-blue-500 border-blue-500' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => handleIndustrySelect(industry.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${industry.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{industry.name}</CardTitle>
                    <p className="text-sm text-gray-600">{industry.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Included templates:</p>
                  <div className="flex flex-wrap gap-1">
                    {industry.templates.map((template, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {template}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedIndustry && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <selectedIndustry.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Perfect! We'll customize everything for {selectedIndustry.name}</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your templates will be tailored for {selectedIndustry.description.toLowerCase()} with industry-specific messaging.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndustryStep;
