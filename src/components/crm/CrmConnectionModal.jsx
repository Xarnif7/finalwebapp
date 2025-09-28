import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Zap, Settings, ExternalLink } from "lucide-react";
import JobberConnectionCard from "./JobberConnectionCard";
import ZapierCrmCard from "../zapier/ZapierCrmCard";
import QuickBooksConnectionCard from "../integrations/QuickBooksConnectionCard";

const CrmConnectionModal = ({ isOpen, onClose, userId, businessId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrm, setSelectedCrm] = useState(null);

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
      <DialogContent className="max-w-[70vw] w-[70vw] max-h-[80vh] h-[80vh] overflow-hidden">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-3xl font-bold text-center">Connect Your CRM</DialogTitle>
          <p className="text-gray-600 text-center mt-2">Choose from popular CRM systems or connect via Zapier</p>
        </DialogHeader>
        
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="popular" className="text-lg py-3">Popular CRMs</TabsTrigger>
            <TabsTrigger value="zapier" className="text-lg py-3">Other CRMs (Zapier)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="space-y-8 mt-6">
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search CRM systems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>

            {/* CRM Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-h-[65vh] overflow-y-auto p-8">
              {filteredCrms.map((crm) => (
                <Card 
                  key={crm.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 hover:scale-105"
                  onClick={() => handleCrmSelect(crm)}
                >
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center text-center space-y-8">
                      {/* Logo */}
                      <div className="w-32 h-32 rounded-3xl bg-white border-2 border-gray-100 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300">
                        <img 
                          src={crm.logo} 
                          alt={`${crm.name} logo`}
                          className="w-20 h-20 object-contain rounded-xl"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${crm.color} flex items-center justify-center`} style={{ display: 'none' }}>
                          <Settings className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{crm.name}</h3>
                        <p className="text-lg text-gray-600 mt-3">{crm.description}</p>
                      </div>
                      
                      {/* Status & Connect Button */}
                      <div className="w-full space-y-4">
                        {crm.connected ? (
                          <div className="flex items-center justify-center space-x-3 text-green-600">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                            <span className="text-lg font-semibold">Connected</span>
                          </div>
                        ) : (
                          <Button 
                            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCrmSelect(crm);
                            }}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* No results */}
            {filteredCrms.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No CRM systems found matching "{searchTerm}"</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="zapier" className="mt-6">
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect via Zapier</h3>
                <p className="text-sm text-gray-600">
                  Use Zapier to connect with 1000+ apps including custom CRM systems
                </p>
              </div>
              
              <ZapierCrmCard userId={userId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CrmConnectionModal;
