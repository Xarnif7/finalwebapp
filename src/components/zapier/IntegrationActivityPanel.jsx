import React from 'react';
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const IntegrationActivityPanel = () => {
  // Placeholder data - will be replaced with real Zap events
  const activities = [
    {
      id: 1,
      type: 'customer_sync',
      message: 'No recent customer syncs',
      time: 'Set up your first Zap to see activity here',
      status: 'info',
      icon: Activity
    },
    {
      id: 2,
      type: 'review_request',
      message: 'No review requests sent via Zap',
      time: 'Configure your Zap templates to start sending requests',
      status: 'info',
      icon: CheckCircle
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'info':
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Integration Activity</h3>
        <Clock className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`${getStatusColor(activity.status)} p-2 rounded-lg bg-gray-50`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Last 10 Zap events will appear here
        </p>
      </div>
    </div>
  );
};

export default IntegrationActivityPanel;
