import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, Info } from 'lucide-react';

const QBO_TRIGGERS = {
  // Invoice Events
  'invoice_created': {
    name: 'Invoice Created',
    description: 'When a new invoice is created in QuickBooks',
    category: 'Invoicing',
    icon: '📄'
  },
  'invoice_sent': {
    name: 'Invoice Sent',
    description: 'When an invoice is emailed to a customer',
    category: 'Invoicing',
    icon: '📧'
  },
  'invoice_paid': {
    name: 'Invoice Paid',
    description: 'When a customer pays an invoice',
    category: 'Invoicing',
    icon: '💰'
  },
  'invoice_overdue': {
    name: 'Invoice Overdue',
    description: 'When an invoice becomes overdue',
    category: 'Invoicing',
    icon: '⚠️'
  },
  'invoice_voided': {
    name: 'Invoice Voided',
    description: 'When an invoice is voided',
    category: 'Invoicing',
    icon: '❌'
  },

  // Customer Events
  'customer_created': {
    name: 'Customer Created',
    description: 'When a new customer is added to QuickBooks',
    category: 'Customers',
    icon: '👤'
  },
  'customer_updated': {
    name: 'Customer Updated',
    description: 'When customer information is updated',
    category: 'Customers',
    icon: '✏️'
  },

  // Payment Events
  'payment_received': {
    name: 'Payment Received',
    description: 'When any payment is received',
    category: 'Payments',
    icon: '💳'
  },
  'payment_failed': {
    name: 'Payment Failed',
    description: 'When a payment attempt fails',
    category: 'Payments',
    icon: '🚫'
  },

  // Estimate Events
  'estimate_created': {
    name: 'Estimate Created',
    description: 'When a new estimate is created',
    category: 'Estimates',
    icon: '📋'
  },
  'estimate_sent': {
    name: 'Estimate Sent',
    description: 'When an estimate is sent to a customer',
    category: 'Estimates',
    icon: '📤'
  },
  'estimate_accepted': {
    name: 'Estimate Accepted',
    description: 'When a customer accepts an estimate',
    category: 'Estimates',
    icon: '✅'
  },
  'estimate_declined': {
    name: 'Estimate Declined',
    description: 'When a customer declines an estimate',
    category: 'Estimates',
    icon: '❌'
  },

  // Sales Receipt Events
  'sales_receipt_created': {
    name: 'Sales Receipt Created',
    description: 'When a sales receipt is created',
    category: 'Sales',
    icon: '🧾'
  },

  // Credit Memo Events
  'credit_memo_created': {
    name: 'Credit Memo Created',
    description: 'When a credit memo is created',
    category: 'Credits',
    icon: '📝'
  },
  'credit_memo_sent': {
    name: 'Credit Memo Sent',
    description: 'When a credit memo is sent to a customer',
    category: 'Credits',
    icon: '📨'
  },

  // Refund Events
  'refund_processed': {
    name: 'Refund Processed',
    description: 'When a refund is processed',
    category: 'Refunds',
    icon: '💸'
  },

  // Item Events
  'item_created': {
    name: 'Item Created',
    description: 'When a new item/service is created',
    category: 'Inventory',
    icon: '📦'
  },
  'item_updated': {
    name: 'Item Updated',
    description: 'When an item/service is updated',
    category: 'Inventory',
    icon: '🔄'
  },

  // Recurring Transaction Events
  'recurring_transaction_created': {
    name: 'Recurring Transaction Created',
    description: 'When a recurring transaction is set up',
    category: 'Recurring',
    icon: '🔄'
  },
  'recurring_transaction_processed': {
    name: 'Recurring Transaction Processed',
    description: 'When a recurring transaction is processed',
    category: 'Recurring',
    icon: '⚡'
  }
};

const QBOTriggerSelector = ({ 
  selectedTriggers = {}, 
  onTriggersChange, 
  disabled = false 
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Group triggers by category
  const triggersByCategory = Object.entries(QBO_TRIGGERS).reduce((acc, [key, trigger]) => {
    if (!acc[trigger.category]) {
      acc[trigger.category] = [];
    }
    acc[trigger.category].push({ key, ...trigger });
    return acc;
  }, {});

  // Filter triggers based on search term
  const filteredTriggersByCategory = Object.entries(triggersByCategory).reduce((acc, [category, triggers]) => {
    const filtered = triggers.filter(trigger => 
      trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trigger.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleTrigger = (triggerKey) => {
    if (disabled) return;
    
    const newTriggers = { ...selectedTriggers };
    if (newTriggers[triggerKey]) {
      delete newTriggers[triggerKey];
    } else {
      newTriggers[triggerKey] = true;
    }
    onTriggersChange(newTriggers);
  };

  const selectAllInCategory = (category) => {
    if (disabled) return;
    
    const newTriggers = { ...selectedTriggers };
    const categoryTriggers = filteredTriggersByCategory[category] || [];
    
    categoryTriggers.forEach(trigger => {
      newTriggers[trigger.key] = true;
    });
    
    onTriggersChange(newTriggers);
  };

  const clearAllInCategory = (category) => {
    if (disabled) return;
    
    const newTriggers = { ...selectedTriggers };
    const categoryTriggers = filteredTriggersByCategory[category] || [];
    
    categoryTriggers.forEach(trigger => {
      delete newTriggers[trigger.key];
    });
    
    onTriggersChange(newTriggers);
  };

  const selectedCount = Object.keys(selectedTriggers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">QuickBooks Triggers</h3>
          <p className="text-sm text-gray-500">
            Select which QuickBooks events should trigger this automation
            {selectedCount > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({selectedCount} selected)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search triggers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {Object.entries(filteredTriggersByCategory).map(([category, triggers]) => (
          <div key={category} className="border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  disabled={disabled}
                >
                  {expandedCategories[category] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>{category}</span>
                  <span className="text-gray-500">({triggers.length})</span>
                </button>
              </div>
              
              {expandedCategories[category] && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => selectAllInCategory(category)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={disabled}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => clearAllInCategory(category)}
                    className="text-xs text-gray-600 hover:text-gray-800"
                    disabled={disabled}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {expandedCategories[category] && (
              <div className="p-3 space-y-2">
                {triggers.map((trigger) => (
                  <div
                    key={trigger.key}
                    className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50"
                  >
                    <button
                      onClick={() => toggleTrigger(trigger.key)}
                      disabled={disabled}
                      className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedTriggers[trigger.key]
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {selectedTriggers[trigger.key] && <Check className="w-3 h-3" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{trigger.icon}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {trigger.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {trigger.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-md">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How it works:</p>
          <p className="mt-1">
            Select the QuickBooks events that should trigger this automation. 
            When any of these events occur in QuickBooks, this template will be used to send a message to the customer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QBOTriggerSelector;
