import React from 'react';
import { Building, Check } from 'lucide-react';

const CRM_OPTIONS = {
  qbo: {
    name: 'QuickBooks Online',
    description: 'Connect to QuickBooks for invoice, payment, and customer events',
    icon: '📊',
    color: 'blue',
    available: true
  },
  jobber: {
    name: 'Jobber',
    description: 'Connect to Jobber for job completion and scheduling events',
    icon: '🔧',
    color: 'green',
    available: false // Coming soon
  },
  housecall_pro: {
    name: 'Housecall Pro',
    description: 'Connect to Housecall Pro for service completion events',
    icon: '🏠',
    color: 'purple',
    available: false // Coming soon
  },
  servicetitan: {
    name: 'ServiceTitan',
    description: 'Connect to ServiceTitan for job and customer events',
    icon: '⚡',
    color: 'orange',
    available: false // Coming soon
  },
  manual: {
    name: 'Manual Trigger',
    description: 'Trigger manually from the customer tab',
    icon: '👆',
    color: 'gray',
    available: true
  }
};

const CRMSelector = ({ selectedCrm, onCrmChange, disabled = false }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Your CRM System</h3>
        <p className="text-sm text-gray-600">
          Select which system will trigger this automation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(CRM_OPTIONS).map(([key, crm]) => (
          <button
            key={key}
            onClick={() => !disabled && onCrmChange(key)}
            disabled={disabled || !crm.available}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              selectedCrm === key
                ? `border-${crm.color}-500 bg-${crm.color}-50`
                : crm.available
                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
            }`}
          >
            {selectedCrm === key && (
              <div className={`absolute top-2 right-2 w-5 h-5 bg-${crm.color}-500 rounded-full flex items-center justify-center`}>
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{crm.icon}</div>
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{crm.name}</h4>
                  {!crm.available && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{crm.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedCrm && CRM_OPTIONS[selectedCrm] && (
        <div className={`p-3 rounded-md bg-${CRM_OPTIONS[selectedCrm].color}-50 border border-${CRM_OPTIONS[selectedCrm].color}-200`}>
          <div className="flex items-center space-x-2">
            <Building className={`w-4 h-4 text-${CRM_OPTIONS[selectedCrm].color}-600`} />
            <span className={`text-sm font-medium text-${CRM_OPTIONS[selectedCrm].color}-800`}>
              {CRM_OPTIONS[selectedCrm].name} Selected
            </span>
          </div>
          <p className={`text-xs text-${CRM_OPTIONS[selectedCrm].color}-700 mt-1`}>
            Next: Choose specific events that will trigger this automation
          </p>
        </div>
      )}
    </div>
  );
};

export default CRMSelector;
