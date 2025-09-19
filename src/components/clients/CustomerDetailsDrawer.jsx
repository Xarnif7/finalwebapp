import React, { useState } from 'react';
import { X, Mail, Phone, Calendar, Tag, Shield, Clock, MessageSquare, Star, Zap, Edit, Archive, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CustomerDetailsDrawer = ({ 
  customer, 
  isOpen, 
  onClose, 
  onEdit, 
  onArchive, 
  onUnarchive, 
  onSendReview 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !customer) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'automations', label: 'Automations', icon: Zap },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Contact Info */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Email</p>
              <p className="text-sm text-slate-600">{customer.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Phone</p>
              <p className="text-sm text-slate-600">{customer.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Service Date</p>
              <p className="text-sm text-slate-600">
                {customer.service_date ? new Date(customer.service_date).toLocaleDateString() : 'Not set'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Status</p>
              <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                {customer.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {customer.tags && customer.tags.length > 0 ? (
            customer.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500">No tags assigned</p>
          )}
        </div>
      </div>

      {/* Consent Flags */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Consent & Deliverability</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${customer.email ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-slate-600">Email verified</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${customer.phone ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-slate-600">SMS opt-in</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-slate-600">Not unsubscribed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-slate-600">Not bounced</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity Timeline</h3>
      <div className="space-y-3">
        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Customer created</p>
            <p className="text-xs text-slate-500">
              {new Date(customer.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        
        {customer.source === 'csv' && (
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Imported via CSV</p>
              <p className="text-xs text-slate-500">Bulk import</p>
            </div>
          </div>
        )}
        
        {customer.source === 'zapier' && (
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Synced via Zapier</p>
              <p className="text-xs text-slate-500">Automated import</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
          <div className="w-2 h-2 bg-gray-400 rounded-full mt-2" />
          <div className="flex-1">
            <p className="text-sm text-slate-500">No review requests sent yet</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Review History</h3>
      <div className="text-center py-8">
        <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No reviews yet</p>
        <p className="text-sm text-slate-400">Send a review request to get started</p>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Message History</h3>
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No messages sent yet</p>
        <p className="text-sm text-slate-400">Messages will appear here when sent</p>
      </div>
    </div>
  );

  const renderAutomations = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Automation Status</h3>
      <div className="text-center py-8">
        <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Not enrolled in any sequences</p>
        <p className="text-sm text-slate-400">Add to a sequence to start automation</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'timeline':
        return renderTimeline();
      case 'reviews':
        return renderReviews();
      case 'messages':
        return renderMessages();
      case 'automations':
        return renderAutomations();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{customer.full_name}</h2>
            <p className="text-sm text-slate-500">{customer.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex space-x-3">
            <Button
              size="sm"
              onClick={() => {
                onSendReview(customer);
                onClose();
              }}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Request Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (customer.status === 'archived') {
                  onUnarchive(customer.id);
                } else {
                  onArchive(customer.id);
                }
                onClose();
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              {customer.status === 'archived' ? 'Unarchive' : 'Archive'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onEdit(customer);
                onClose();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsDrawer;
