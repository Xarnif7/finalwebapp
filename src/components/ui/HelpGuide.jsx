import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Users, 
  Zap, 
  MessageSquare, 
  BarChart3, 
  Heart
} from 'lucide-react';

const HelpGuide = ({ isOpen, onClose }) => {

  const steps = [
    {
      number: 1,
      icon: Users,
      title: "Connect Your Data",
      description: "Connect your CRM or manually add customers",
      details: [
        "Connect Jobber, Housecall Pro, or ServiceTitan",
        "Import customers via CSV file",
        "Manually add individual customers"
      ],
      action: "Go to Customers",
      gradient: "from-blue-500 to-cyan-500",
      route: "Clients"
    },
    {
      number: 2,
      icon: Zap,
      title: "Set Up Automations",
      description: "Create email/SMS templates for different service types",
      details: [
        "Configure when to send (job completed, invoice paid)",
        "Customize templates for each service type",
        "Set up automated review request sequences"
      ],
      action: "Go to Automations",
      gradient: "from-purple-500 to-pink-500",
      route: "AutomatedRequests"
    },
    {
      number: 3,
      icon: MessageSquare,
      title: "Link Social Platforms",
      description: "Connect Google Business Profile, Facebook, Yelp",
      details: [
        "Manage all reviews in one unified inbox",
        "Centralize your online reputation management",
        "Get notifications for new reviews"
      ],
      action: "Go to Reviews",
      gradient: "from-green-500 to-emerald-500",
      route: "ReviewInbox"
    },
    {
      number: 4,
      icon: BarChart3,
      title: "Monitor Performance",
      description: "Track success rates and customer analytics",
      details: [
        "View review request success rates",
        "Track customer response analytics",
        "Monitor automation performance"
      ],
      action: "Go to Analytics",
      gradient: "from-orange-500 to-red-500",
      route: "Analytics"
    },
    {
      number: 5,
      icon: Heart,
      title: "Engage & Respond",
      description: "Get AI-powered replies and manage feedback",
      details: [
        "Get AI-powered reply suggestions",
        "Respond to reviews directly from Blipp",
        "Turn reviews into positive customer experiences"
      ],
      action: "Go to Conversations",
      gradient: "from-pink-500 to-rose-500",
      route: "Conversations"
    }
  ];


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            🚀 Blipp Setup Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            
            return (
              <div
                key={step.number}
                className="relative p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-gray-300 transition-all duration-300"
              >
                {/* Progress Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-8 top-20 w-0.5 h-16 bg-gray-200" />
                )}

                <div className="flex items-start space-x-4">
                  {/* Step Number & Icon */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-r ${step.gradient}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                      <span className="text-xs font-bold text-gray-600">{step.number}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 mt-1 mb-3">
                      {step.description}
                    </p>

                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`bg-gradient-to-r ${step.gradient} hover:opacity-90 text-white`}
                      onClick={() => {
                        // Navigate to the route
                        window.location.href = `#${step.route.toLowerCase()}`;
                      }}
                    >
                      {step.action}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              🎉 You're all set!
            </h4>
            <p className="text-gray-600 mb-6">
              Complete these 5 steps to get the most out of Blipp and start growing your online reputation.
            </p>
          </div>
        </div>

        {/* Contact Support Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              alert('Please contact via email xarnif7@gmail.com for any immediate issues or problems.');
            }}
            className="flex items-center px-8 py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 border-0"
          >
            💬 Contact Support
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpGuide;
