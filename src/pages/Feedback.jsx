import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Settings, Eye, Code } from 'lucide-react';

const Feedback = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Determine active tab based on current path
    const path = location.pathname;
    if (path.includes('/form-setup')) return 'form-setup';
    if (path.includes('/collected')) return 'collected';
    if (path.includes('/widget')) return 'widget';
    return 'form-setup'; // default
  });

  const tabs = [
    {
      id: 'form-setup',
      name: 'Form Setup',
      icon: Settings,
      description: 'Preview + settings for branded feedback form'
    },
    {
      id: 'collected',
      name: 'Collected Feedback',
      icon: MessageCircle,
      description: 'Inbox of responses (private feedback)'
    },
    {
      id: 'widget',
      name: 'Widget',
      icon: Code,
      description: 'Testimonial widget management + embed code'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'form-setup':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Form Preview</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Form preview will appear here</p>
                <p className="text-sm text-gray-400 mt-2">Configure your branded feedback form settings below</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form Title</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How was your experience?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branding Color</label>
                  <input 
                    type="color" 
                    className="w-20 h-10 border border-gray-300 rounded-md"
                    defaultValue="#3B82F6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Thank you for your feedback..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'collected':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Collected Feedback</h3>
              <div className="text-center py-12">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">No feedback collected yet</p>
                <p className="text-sm text-gray-400">Private feedback responses will appear here once customers start submitting</p>
              </div>
            </div>
          </div>
        );

      case 'widget':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Testimonial Widget</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Widget Preview</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Widget preview will appear here</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Embed Code</label>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <code className="text-sm text-gray-800">
                      {`<script src="https://widget.blipp.com/embed.js" data-business-id="your-business-id"></script>`}
                    </code>
                  </div>
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Copy Embed Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-2 text-gray-600">Manage your feedback collection and testimonial widgets</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Feedback;
