import React, { useState, useEffect } from 'react';
import { Zap, ExternalLink, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { getZapStatus } from '../../lib/zapier';
import { apiClient } from '../../lib/apiClient';
import ZapierConnectionModal from './ZapierConnectionModal';

const ZapierCrmCard = ({ userId }) => {
  const [zapStatus, setZapStatus] = useState('not_connected');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const loadZapStatus = async () => {
      try {
        const status = await getZapStatus(userId);
        setZapStatus(status);
        
        // If connected, fetch webhook secret
        if (status === 'connected') {
          await fetchWebhookSecret();
        }
      } catch (error) {
        console.error('Failed to load Zapier status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadZapStatus();
  }, [userId]);

  const fetchWebhookSecret = async () => {
    try {
      const response = await fetch('/api/zapier/webhook-secret', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWebhookSecret(data.secret || '');
      }
    } catch (error) {
      console.error('Failed to fetch webhook secret:', error);
    }
  };

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
    // Optimistically update status to connected
    setZapStatus('connected');
    
    // Auto-create default sequences when CRM is connected
    await createDefaultSequences();
  };

  const createDefaultSequences = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/sequences/create-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sequences && data.sequences.length > 0) {
          console.log('Default sequences created:', data.sequences);
          // Show a subtle notification that sequences were created
          // The user will see them in the Automations tab
        }
      } else {
        console.error('Failed to create default sequences:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating default sequences:', error);
    }
  };


  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(webhookSecret);
      // You could add a toast notification here
      console.log('Webhook secret copied to clipboard');
    } catch (error) {
      console.error('Failed to copy webhook secret:', error);
    }
  };

  const getStatusInfo = () => {
    switch (zapStatus) {
      case 'connected':
        return {
          text: 'Connected',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        };
      case 'not_connected':
      default:
        return {
          text: 'Not connected',
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

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
              <StatusIcon className="h-4 w-4 text-gray-400" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {zapStatus === 'connected' ? (
                <>
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
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Connect via Zapier</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Webhook Secret Section - Only show when connected */}
        {zapStatus === 'connected' && webhookSecret && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Webhook Secret</h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleCopySecret}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Use this secret in your Zapier webhook to authenticate requests
            </p>
            <div className="bg-white border rounded p-2 font-mono text-sm">
              {showSecret ? webhookSecret : '••••••••••••••••••••••••••••••••'}
            </div>
          </div>
        )}
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
