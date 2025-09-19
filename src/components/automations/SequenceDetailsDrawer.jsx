import React, { useState } from 'react';
import { X, Play, Pause, Copy, Archive, Edit, Mail, MessageSquare, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SequenceDetailsDrawer = ({ 
  sequence, 
  isOpen, 
  onClose, 
  onEdit, 
  onPause, 
  onResume, 
  onDuplicate, 
  onArchive, 
  onDelete 
}) => {
  const [activeMetric, setActiveMetric] = useState('overview');

  if (!isOpen || !sequence) return null;

  const metrics = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'steps', label: 'Step Metrics', icon: TrendingUp },
    { id: 'rules', label: 'Rules & Settings', icon: Clock }
  ];

  const mockMetrics = {
    enrolled: 45,
    completed: 38,
    converted: 9,
    unsubscribed: 2,
    bounced: 1,
    stepMetrics: [
      { step: 'Send Email', sent: 45, delivered: 43, opened: 28, clicked: 12, converted: 9 },
      { step: 'Wait 5h', sent: 45, delivered: 45, opened: 0, clicked: 0, converted: 0 },
      { step: 'Send SMS', sent: 38, delivered: 37, opened: 25, clicked: 8, converted: 3 }
    ]
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{mockMetrics.enrolled}</div>
            <div className="text-sm text-slate-600">Enrolled</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{mockMetrics.completed}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{mockMetrics.converted}</div>
            <div className="text-sm text-slate-600">Converted</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{sequence.conversionRate}%</div>
            <div className="text-sm text-slate-600">Conversion Rate</div>
          </div>
        </div>
      </div>

      {/* Exit Rules */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Exit Rules</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Stop if review left</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Stop if unsubscribed</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Stop if customer archived</span>
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quiet Hours</h3>
        <div className="text-sm text-slate-600">
          <p>No sends between 10 PM - 8 AM (EST)</p>
          <p>Weekends: 9 AM - 6 PM only</p>
        </div>
      </div>
    </div>
  );

  const renderStepMetrics = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Step-by-Step Performance</h3>
      {mockMetrics.stepMetrics.map((step, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{step.step}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <div className="font-medium text-slate-900">{step.sent}</div>
                <div className="text-slate-500">Sent</div>
              </div>
              <div>
                <div className="font-medium text-slate-900">{step.delivered}</div>
                <div className="text-slate-500">Delivered</div>
              </div>
              <div>
                <div className="font-medium text-slate-900">{step.opened}</div>
                <div className="text-slate-500">Opened</div>
              </div>
              <div>
                <div className="font-medium text-slate-900">{step.clicked}</div>
                <div className="text-slate-500">Clicked</div>
              </div>
              <div>
                <div className="font-medium text-green-600">{step.converted}</div>
                <div className="text-slate-500">Converted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderRules = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Enrollment Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium">Zapier Trigger</span>
            <Badge variant="outline">Job Completed</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium">Manual Enrollment</span>
            <Badge variant="outline">Enabled</Badge>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Rate Limits</h3>
        <div className="space-y-2 text-sm">
          <p>Max 10 sends per hour per customer</p>
          <p>Max 50 sends per day per customer</p>
          <p>Respects customer timezone</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeMetric) {
      case 'overview':
        return renderOverview();
      case 'steps':
        return renderStepMetrics();
      case 'rules':
        return renderRules();
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
            <h2 className="text-xl font-semibold text-slate-900">{sequence.name}</h2>
            <p className="text-sm text-slate-500">{sequence.enrollmentRule}</p>
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
                if (sequence.status === 'active') {
                  onPause(sequence.id);
                } else {
                  onResume(sequence.id);
                }
                onClose();
              }}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              {sequence.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onDuplicate(sequence.id);
                onClose();
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onEdit(sequence);
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
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <button
                  key={metric.id}
                  onClick={() => setActiveMetric(metric.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeMetric === metric.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{metric.label}</span>
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

export default SequenceDetailsDrawer;
