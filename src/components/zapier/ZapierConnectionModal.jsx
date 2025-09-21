import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, Zap, Search, Settings, Play } from 'lucide-react';
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
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-3">📋 Complete Setup Guide:</h4>
                  <div className="space-y-4">
                    
                    {/* Step 1 */}
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mt-0.5">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-900 flex items-center">
                          <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">1</span>
                          Sign in to Zapier
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          Click the button below - you'll be taken to Zapier where you'll need to sign in (free account)
                        </div>
                        <div className="bg-blue-100 rounded p-2 mt-2 text-xs text-blue-700">
                          💡 <strong>Tip:</strong> Don't have a Zapier account? Sign up for free at zapier.com first
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mt-0.5">
                        <Search className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-900 flex items-center">
                          <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">2</span>
                          Choose Your CRM Trigger
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          In the "Trigger" step, search for your CRM (Google Sheets, Jobber, HouseCall Pro, etc.)
                        </div>
                        <div className="bg-blue-100 rounded p-2 mt-2 text-xs text-blue-700">
                          🔍 <strong>Popular choices:</strong> Google Sheets, Jobber, HouseCall Pro, HubSpot, Airtable
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-200 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-900 flex items-center">
                          <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">3</span>
                          Search for "Blipp" in Actions
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          In the "Action" step, search for "Blipp" and select "Blipp (1.0.0)" from the results
                        </div>
                        <div className="bg-blue-100 rounded p-2 mt-2 text-xs text-blue-700">
                          🔍 <strong>Look for:</strong> "Blipp (1.0.0)" or "Blipp" in the app search results
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-200 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mt-0.5">
                        <Play className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-900 flex items-center">
                          <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">4</span>
                          Connect & Test Your Zap
                        </div>
                        <div className="text-sm text-blue-800 mt-1">
                          Connect your CRM account, authorize Blipp, test the connection, and turn on your Zap!
                        </div>
                        <div className="bg-blue-100 rounded p-2 mt-2 text-xs text-blue-700">
                          🎯 <strong>Result:</strong> New customers in your CRM will automatically trigger Blipp automations
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="text-center space-y-3">
                  <a
                    href="https://zapier.com/app/editor/create-zap"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 font-medium text-lg"
                  >
                    <ExternalLink className="h-6 w-6 mr-3" />
                    Connect Your CRM in Zapier
                  </a>
                  <p className="text-sm text-gray-500">
                    Opens Zapier - search for "Blipp" in the Action step
                  </p>
                  
                  {/* Alternative with specific search */}
                  <div className="text-xs text-gray-400">
                    or try: <a href="https://zapier.com/app/editor/create-zap?search=blipp" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Direct Blipp Search</a>
                  </div>
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
