import React, { useState, useEffect } from 'react';
import { Zap, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { getZapStatus } from '../../lib/zapier';
import ZapierConnectionModal from './ZapierConnectionModal';

const ZapierCrmCard = ({ userId }) => {
  const [zapStatus, setZapStatus] = useState('not_connected');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadZapStatus = async () => {
      try {
        const status = await getZapStatus(userId);
        setZapStatus(status);
      } catch (error) {
        console.error('Failed to load Zapier status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadZapStatus();
  }, [userId]);

  const handleConnect = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Optimistically update status to connected
    setZapStatus('connected');
  };

  const handleViewZaps = () => {
    // TODO: Open Zapier dashboard or user's Zaps
    window.open('https://zapier.com/app/dashboard', '_blank');
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
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
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 flex items-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Connect via Zapier</span>
              </button>
              
              <button
                onClick={handleViewZaps}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View My Zaps</span>
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
