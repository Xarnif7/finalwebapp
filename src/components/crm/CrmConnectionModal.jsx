import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Zap, Settings, ExternalLink } from "lucide-react";
import JobberConnectionCard from "./JobberConnectionCard";
import ZapierCrmCard from "../zapier/ZapierCrmCard";

const CrmConnectionModal = ({ isOpen, onClose, userId, businessId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCrm, setSelectedCrm] = useState(null);

  // Popular CRM integrations
  const popularCrms = [
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <button onClick={handleBackToList} className="mr-2 text-gray-600 hover:text-gray-800">
                ←
              </button>
              <span>Connect {selectedCrm.name}</span>
            </DialogTitle>
          </DialogHeader>
          <CrmComponent userId={userId} businessId={businessId} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Connect Your CRM</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="popular">Popular CRMs</TabsTrigger>
            <TabsTrigger value="zapier">Other CRMs (Zapier)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="space-y-4 mt-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search CRM systems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* CRM Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredCrms.map((crm) => (
                <Card 
                  key={crm.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                  onClick={() => handleCrmSelect(crm)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Logo */}
                      <div className="w-20 h-20 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                        <img 
                          src={crm.logo} 
                          alt={`${crm.name} logo`}
                          className="w-14 h-14 object-contain rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${crm.color} flex items-center justify-center`} style={{ display: 'none' }}>
                          <Settings className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{crm.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{crm.description}</p>
                      </div>
                      
                      {/* Status & Connect Button */}
                      <div className="w-full space-y-2">
                        {crm.connected ? (
                          <div className="flex items-center justify-center space-x-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">Connected</span>
                          </div>
                        ) : (
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
