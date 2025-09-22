import React, { useState } from 'react';
import { Zap, ExternalLink } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import ZapierConnectionModal from './ZapierConnectionModal';

const ZapierCrmCard = ({ userId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnect = () => {
    setIsModalOpen(true);
  };

  const handleZapierConnected = async (zapConfig) => {
    try {
      // Save the Zapier integration to the database
      const response = await apiClient.post(`/api/zapier-integrations/${businessId}`, {
        zapier_account_email: user?.email,
        zap_config: zapConfig,
        status: 'pending'
      });

      if (response.success) {
        console.log('Zapier integration saved:', response.integration);
        // Refresh the integration status
        await fetchIntegrationStatus();
      }
    } catch (error) {
      console.error('Error saving Zapier integration:', error);
    }
  };

  const handleModalClose = async () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect CRM (Zapier)</h3>
              <p className="text-sm text-gray-600">Sync customers automatically from your CRM</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.open('https://zapier.com/app/dashboard', '_blank')}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Manage My Zaps</span>
              </button>
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 flex items-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Add New Zap</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <ZapierConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleModalClose}
      />
    </>
  );
};

export default ZapierCrmCard;
