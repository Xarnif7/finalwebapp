import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle } from 'lucide-react';
import { zapTemplates } from '../../lib/zapier';

const ZapierConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Open the first Zap template in a new tab (most common use case)
    const firstTemplate = zapTemplates[0];
    window.open(firstTemplate.href, '_blank');
    
    // Show success state immediately since user will complete setup in Zapier
    setTimeout(() => {
      setIsConnecting(false);
      setConnected(true);
      onConnect();
    }, 1000);
  };

  const handleTemplateClick = (template) => {
    // Open template in new tab
    window.open(template.href, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Connect via Zapier</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!connected ? (
            <>
              {/* Explainer */}
              <div className="mb-6">
                <p className="text-gray-600">
                  Connect your CRM to Blipp using Zapier. Pick your CRM, authorize, and we'll start 
                  syncing customers and triggering review requests after jobs/invoices.
                </p>
              </div>

              {/* Zap Templates */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Zap Templates</h3>
                <div className="space-y-3">
                  {zapTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => handleTemplateClick(template)}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-900">
                            {template.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-blue-600 ml-3 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connect Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect via Zapier'}
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Started!</h3>
              <p className="text-gray-600 mb-6">
                Finish setup in Zapier; events will appear here once configured.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZapierConnectionModal;
