import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Settings } from 'lucide-react';
import PrivateFeedbackInbox from '../components/feedback/PrivateFeedbackInbox';
import FeedbackFormSetup from '../components/feedback/FeedbackFormSetup';

const Feedback = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Determine active tab based on current path
    const path = location.pathname;
    if (path.includes('/form-setup')) return 'form-setup';
    if (path.includes('/collected')) return 'collected';
    return 'collected'; // default to Collected Feedback first
  });

  const tabs = [
    {
      id: 'collected',
      name: 'Collected Feedback',
      icon: MessageCircle,
      description: 'Inbox of responses (private feedback)'
    },
    {
      id: 'form-setup',
      name: 'Form Setup',
      icon: Settings,
      description: 'Preview + settings for branded feedback form'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'form-setup':
        return <FeedbackFormSetup />;

      case 'collected':
        return <PrivateFeedbackInbox />;


      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
        <p className="mt-2 text-gray-600">Manage your feedback collection and form setup</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Feedback navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Feedback;
