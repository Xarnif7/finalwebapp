import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle } from 'lucide-react';
import { zapTemplates } from '../../lib/zapier';

const ZapierConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Open the Blipp 1.0 CRM connection template in Zapier
    window.open('https://zapier.com/app/editor/create-zap?template=blipp-crm-connection', '_blank');
    
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
              {/* Simple CRM Connection Instructions */}
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Connect your CRM to Blipp in just a few clicks using our pre-built Zapier integration.
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-3">🚀 Super Simple Setup:</h4>
                  <ol className="text-sm text-green-800 space-y-2">
                    <li className="flex items-start">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                      <div>
                        <strong>Click a link below</strong> - You'll need to sign in to Zapier first
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                      <div>
                        <strong>Choose your trigger</strong> (Google Sheets, Jobber, etc.)
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                      <div>
                        <strong>Search for "Blipp"</strong> in the action step and select it
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                      <div>
                        <strong>Connect and test</strong> your Zap, then turn it on!
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="text-center space-y-3">
                  <a
                    href="https://zapier.com/app/editor/create-zap?template=blipp-google-sheets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 font-medium"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Start with Google Sheets (Recommended)
                  </a>
                  
                  <div className="text-sm text-gray-500">
                    or
                  </div>
                  
                  <a
                    href="https://zapier.com/app/editor/create-zap?action=blipp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Choose Your Own CRM
                  </a>
                </div>
              </div>

              {/* Supported CRMs */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Supported CRM Systems:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Jobber
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    HouseCall Pro
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Google Sheets
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Airtable
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    HubSpot
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Pipedrive
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Salesforce
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    + 1000+ more
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500 space-y-2">
                <p>Need help? Our template will guide you through each step!</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-xs">
                    <strong>Note:</strong> You'll need a Zapier account to connect your CRM. 
                    Don't have one? It's free to sign up at zapier.com
                  </p>
                </div>
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
