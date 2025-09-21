import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const ZapierConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showPopularCRMs, setShowPopularCRMs] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Open Zapier with Blipp pre-selected
    window.open('https://zapier.com/app/editor/create-zap', '_blank');
    
    // Show success state immediately since user will complete setup in Zapier
    setTimeout(() => {
      setIsConnecting(false);
      setConnected(true);
      onConnect();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Connect via Zapier</h2>
              <p className="text-blue-100 text-sm mt-1">Link your CRM to Blipp in a couple of minutes</p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!connected ? (
            <>
              <p className="text-gray-600 mb-6 text-center">
                You'll set a CRM trigger, then add the Blipp action to send customers to Blipp automatically.
              </p>

              {/* Section A: Step 1 — Choose your CRM Trigger */}
              <div className="bg-gray-50 rounded-lg p-5 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
                  Choose your CRM Trigger
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Sign in to Zapier.
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Click "Create Zap".
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    In the Trigger step, search your CRM (Jobber, Housecall Pro, HubSpot, Google Sheets, Airtable, etc.).
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Pick the event "New or Updated Customer/Contact" (names vary by CRM).
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Connect your CRM account and "Test trigger" to pull a sample record.
                  </li>
                </ul>
                
                <div className="mt-3 text-xs text-gray-500">
                  <strong>Event names vary:</strong> "New Customer", "New Contact", "New/Updated Row" (sheets), "Customer Created".
                  <br />
                  <strong>You only need EMAIL or PHONE.</strong> Name, external ID, and service date are optional but recommended.
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={handleConnect}
                    className="px-6 py-2 bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-lg hover:from-[#1557B0] hover:to-[#6D28D9] transition-all duration-200 font-medium"
                  >
                    Open Zapier
                  </button>
                  <button
                    onClick={() => setShowPopularCRMs(!showPopularCRMs)}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                  >
                    See popular CRMs
                    {showPopularCRMs ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                  </button>
                </div>

                {showPopularCRMs && (
                  <div className="mt-4 p-3 bg-white rounded border border-gray-200 text-xs">
                    <div className="space-y-2">
                      <div><strong>Jobber:</strong> Trigger = "New/Updated Client"</div>
                      <div><strong>Housecall Pro:</strong> Trigger = "New/Updated Customer"</div>
                      <div><strong>Google Sheets:</strong> Trigger = "New or Updated Row" (make sure Email column exists)</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section B: Step 2 — Add Blipp (1.0.0) Action */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Add Blipp (1.0.0) Action
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    In the Action step, search "Blipp" and select "Blipp (1.0.0)".
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Choose Action: "Create/Update Customer".
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Choose "Blipp Account" connection (authorize if prompted).
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Map your fields:
                  </li>
                </ul>
                
                <div className="ml-4 mt-2 text-xs text-gray-600 space-y-1">
                  <div>• email → Email</div>
                  <div>• phone → Phone (optional)</div>
                  <div>• first_name → First Name (optional)</div>
                  <div>• last_name → Last Name (optional)</div>
                  <div>• external_id → CRM Customer ID (or sheet Row ID)</div>
                  <div>• service_date → Next Service or Appointment Date (optional)</div>
                  <div>• tags, source, event_ts → map if available</div>
                </div>

                <ul className="space-y-2 text-sm text-gray-700 mt-4">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    Click "Test action" → you should see a success response.
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  <strong>Success note:</strong> After your first successful test, Blipp will auto-create your default automations and mark them 'Connected & Ready'.
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
