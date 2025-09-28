import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Zap, Settings, ExternalLink, ChevronRight } from "lucide-react";
import JobberConnectionCard from "./JobberConnectionCard";
import ZapierCrmCard from "../zapier/ZapierCrmCard";
import QuickBooksConnectionCard from "../integrations/QuickBooksConnectionCard";

// Reusable IntegrationCard component
const IntegrationCard = ({ crm, onSelect }) => {
  return (
    <div 
      className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition min-h-[220px] flex flex-col gap-4 h-full justify-between"
      aria-label={`Connect ${crm.name}`}
    >
      {/* Logo wrapper */}
      <div className="h-12 flex items-center justify-center">
        <div className="max-w-[160px] flex items-center justify-center">
          <img 
            src={crm.logo} 
            alt={`${crm.name} logo`}
            className="max-h-10 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${crm.color} flex items-center justify-center`} style={{ display: 'none' }}>
            <Settings className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      
      {/* Title and description */}
      <div className="flex-1">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{crm.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{crm.description}</p>
      </div>
      
      {/* Connect button */}
      <Button 
        className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7C3AED]"
        onClick={() => onSelect(crm)}
        aria-label={`Connect ${crm.name} to Blipp`}
      >
        Connect
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

const CrmConnectionModal = ({ isOpen, onClose, userId, businessId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrm, setSelectedCrm] = useState(null);
  const [activeTab, setActiveTab] = useState('popular');

  // Popular CRM integrations
  const popularCrms = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Accounting and customer management',
      logo: '/images/crm/QuickBooks ICON.png',
      color: 'from-blue-500 to-blue-700',
      connected: false,
      component: QuickBooksConnectionCard
    },
    {
      id: 'jobber',
      name: 'Jobber',
      description: 'Field service management for home services',
      logo: '/images/crm/Jobber ICON.jpg',
      color: 'from-orange-400 to-orange-600',
      connected: false, // This would come from your connection status
      component: JobberConnectionCard
    },
    {
      id: 'housecall_pro',
      name: 'Housecall Pro',
      description: 'Home service business management',
      logo: '/images/crm/Housecall Pro ICON.jpg',
      color: 'from-blue-500 to-blue-700',
      connected: false,
      component: null // Will implement later
    },
    {
      id: 'servicetitan',
      name: 'ServiceTitan',
      description: 'Complete business management platform',
      logo: '/images/crm/ServiceTitan ICON.png',
      color: 'from-green-500 to-green-700',
      connected: false,
      component: null // Will implement later
    }
  ];

  // Filter CRMs based on search
  const filteredCrms = popularCrms.filter(crm =>
    crm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crm.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCrmSelect = (crm) => {
    console.log('🔧 CRM Selected:', crm);
    console.log('🔧 Setting selectedCrm to:', crm.name);
    setSelectedCrm(crm);
  };

  const handleBackToList = () => {
    setSelectedCrm(null);
  };

  // If a specific CRM is selected, show its connection interface
  if (selectedCrm) {
    console.log('🔧 Rendering CRM component for:', selectedCrm.name);
    console.log('🔧 Component:', selectedCrm.component);
    console.log('🔧 Props being passed:', { userId, businessId });
    const CrmComponent = selectedCrm.component;
    
    if (!CrmComponent) {
      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <button onClick={handleBackToList} className="mr-2">
                  ←
                </button>
                <span>Connect {selectedCrm.name}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-8">
              <div className="text-lg font-medium mb-2">Coming Soon!</div>
              <div className="text-sm text-gray-600 mb-4">
                {selectedCrm.name} integration is in development.
              </div>
              <Button onClick={handleBackToList} variant="outline">
                Back to CRM List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[80vw] w-[80vw] max-h-[85vh] h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center space-x-3 text-3xl font-bold">
              <button onClick={handleBackToList} className="mr-3 text-gray-600 hover:text-gray-800 text-2xl">
                ←
              </button>
              <span>Connect {selectedCrm.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <CrmComponent userId={userId} businessId={businessId} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
      <DialogContent className="w-[95vw] max-w-5xl p-0 overflow-hidden rounded-2xl">
        {/* Modal header */}
        <div className="px-8 py-6 md:px-10 md:py-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Connect Your CRM</DialogTitle>
            <p className="text-gray-600 mt-2">Choose from popular CRM systems or connect via Zapier</p>
          </DialogHeader>
        </div>
        
        {/* Bottom content */}
        <div className="px-8 pb-8 md:px-10">
          <Tabs defaultValue="popular" className="w-full">
            {/* Custom tabs */}
            <div className="flex gap-3 mb-6">
              <button
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50 ${
                  activeTab === 'popular' ? 'bg-gray-100' : ''
                }`}
                onClick={() => setActiveTab('popular')}
              >
                Popular CRMs
              </button>
              <button
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50 ${
                  activeTab === 'zapier' ? 'bg-gray-100' : ''
                }`}
                onClick={() => setActiveTab('zapier')}
              >
                Other CRMs (Zapier)
              </button>
            </div>
          
            {activeTab === 'popular' && (
              <div>
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search CRM systems..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-200 pl-10"
                  />
                </div>

                {/* CRM Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  {filteredCrms.map((crm) => (
                    <IntegrationCard 
                      key={crm.id} 
                      crm={crm}
                      onSelect={handleCrmSelect}
                    />
                  ))}
                </div>

                {/* No results */}
                {filteredCrms.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No CRM systems found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          
            {activeTab === 'zapier' && (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connect via Zapier</h3>
                  <p className="text-sm text-gray-600">
                    Use Zapier to connect with 1000+ apps including custom CRM systems
                  </p>
                </div>
                <ZapierCrmCard userId={userId} />
              </div>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrmConnectionModal;
