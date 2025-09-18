import React from 'react';
import { 
  Star, 
  Users, 
  Send, 
  TrendingUp, 
  Plus, 
  Download, 
  MessageCircle,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react';

const DashboardOverview = () => {
  // KPI Cards data
  const kpiCards = [
    {
      title: 'Total Reviews',
      value: '0',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Average Rating',
      value: '0.0',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Requests Sent',
      value: '0',
      icon: Send,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Response Rate',
      value: '0%',
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  // Recent Activity data
  const recentActivities = [
    {
      id: 1,
      type: 'review',
      message: 'No recent reviews yet',
      time: 'Get started by sending your first review request',
      icon: Star,
      color: 'text-gray-400'
    },
    {
      id: 2,
      type: 'automation',
      message: 'No automations created yet',
      time: 'Create your first automation to streamline review collection',
      icon: Activity,
      color: 'text-gray-400'
    },
    {
      id: 3,
      type: 'customer',
      message: 'No customers imported yet',
      time: 'Import your customer list to start sending review requests',
      icon: Users,
      color: 'text-gray-400'
    }
  ];

  // Quick Actions data
  const quickActions = [
    {
      title: 'Import Customers',
      description: 'Upload your customer list',
      icon: Download,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      title: 'Send Review Request',
      description: 'Send a manual review request',
      icon: Send,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    },
    {
      title: 'Create Automation',
      description: 'Set up automated review requests',
      icon: Plus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      title: 'View Reports',
      description: 'Check your performance metrics',
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of your review management performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className={`${card.bgColor} ${card.borderColor} border rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg bg-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`${activity.color} p-2 rounded-lg bg-gray-50`}>
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
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <MessageCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    className={`${action.bgColor} ${action.hoverColor} ${action.color} p-4 rounded-lg border border-gray-200 text-left transition-colors hover:shadow-sm`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Welcome Message for New Users */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Welcome to Blipp!</h3>
              <p className="text-sm text-blue-700 mt-1">
                Get started by importing your customers and setting up your first automation. 
                This will help you collect more reviews and improve your online reputation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
