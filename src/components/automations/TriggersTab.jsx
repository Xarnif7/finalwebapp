import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Webhook, 
  FileText, 
  ExternalLink, 
  Copy, 
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart
} from 'lucide-react';
import { toast } from 'sonner';
import { useZapierStatus } from '../../hooks/useZapierStatus';
import { useTriggersData } from '../../hooks/useTriggersData';

const TriggersTab = () => {
  const { isConnected: isZapierConnected, loading: zapierLoading } = useZapierStatus();
  const { triggers, loading, error } = useTriggersData();
  const [testing, setTesting] = useState(null);

  const getTriggerIcon = (type) => {
    switch (type) {
      case 'zapier':
        return <Zap className="w-5 h-5" />;
      case 'webhook':
        return <Webhook className="w-5 h-5" />;
      case 'csv':
        return <FileText className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (trigger) => {
    let status = trigger.status;
    if (trigger.type === 'zapier' && !isZapierConnected) {
      status = 'inactive';
    }
    
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-600',
      error: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status] || variants.inactive}>
        {status === 'active' ? (
          <CheckCircle className="w-3 h-3 mr-1" />
        ) : (
          <AlertCircle className="w-3 h-3 mr-1" />
        )}
        {status}
      </Badge>
    );
  };

  const formatLastFired = (lastFired) => {
    if (!lastFired) return 'Never';
    const date = new Date(lastFired);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleViewZaps = (zapierUrl) => {
    window.open(zapierUrl, '_blank');
  };

  const handleCopyWebhookUrl = (webhookUrl) => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  const handleTestTrigger = async (trigger) => {
    try {
      setTesting(trigger.id);
      
      // Simulate test event based on trigger type
      let testData;
      switch (trigger.type) {
        case 'zapier':
          testData = {
            event_type: trigger.id.includes('job') ? 'job_completed' : 'invoice_paid',
            email: 'test@example.com',
            phone: '+1234567890',
            first_name: 'Test',
            last_name: 'User',
            service_date: new Date().toISOString()
          };
          break;
        case 'webhook':
          testData = {
            event_type: 'webhook_test',
            email: 'test@example.com',
            phone: '+1234567890',
            first_name: 'Test',
            last_name: 'User'
          };
          break;
        case 'csv':
          testData = {
            event_type: 'csv_import',
            email: 'test@example.com',
            phone: '+1234567890',
            first_name: 'Test',
            last_name: 'User'
          };
          break;
        default:
          throw new Error('Unknown trigger type');
      }

      // Send test event
      const response = await fetch('http://localhost:3001/api/zapier/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zapier-Token': process.env.REACT_APP_ZAPIER_TOKEN || 'test-token'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        toast.success(`${trigger.name} test event sent successfully!`);
        // Note: The triggers will be refetched automatically by the useTriggersData hook
      } else {
        throw new Error('Failed to send test event');
      }
    } catch (error) {
      console.error('Error testing trigger:', error);
      toast.error(`Failed to test ${trigger.name}`);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Triggers</h2>
          <p className="text-slate-600 mt-1">
            Manage your automation triggers and webhooks
          </p>
        </div>
      </div>

      {/* Triggers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {triggers.map((trigger) => (
          <Card key={trigger.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getTriggerIcon(trigger.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {trigger.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 capitalize">
                      {trigger.type} trigger
                    </p>
                  </div>
                </div>
                {getStatusBadge(trigger)}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <BarChart className="w-4 h-4" />
                      7-day volume
                    </div>
                    <div className="font-semibold text-slate-900">
                      {trigger.volume7d} events
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Last fired
                    </div>
                    <div className="font-semibold text-slate-900">
                      {formatLastFired(trigger.lastFired)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {trigger.type === 'zapier' && trigger.zapierUrl && (
                    <Button
                      onClick={() => handleViewZaps(trigger.zapierUrl)}
                      variant="outline"
                      className="w-full"
                      disabled={!isZapierConnected}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Zaps
                    </Button>
                  )}
                  
                  {trigger.type === 'webhook' && trigger.webhookUrl && (
                    <Button
                      onClick={() => handleCopyWebhookUrl(trigger.webhookUrl)}
                      variant="outline"
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Webhook URL
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleTestTrigger(trigger)}
                    disabled={testing === trigger.id || (trigger.type === 'zapier' && !isZapierConnected)}
                    className="w-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {testing === trigger.id ? 'Testing...' : 'Test Trigger'}
                  </Button>
                </div>

                {/* Additional Info */}
                {trigger.type === 'zapier' && !isZapierConnected && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Connect to Zapier to activate this trigger
                  </div>
                )}
                
                {trigger.type === 'webhook' && trigger.webhookUrl && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono">
                    {trigger.webhookUrl}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {triggers.filter(t => t.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Triggers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {triggers.reduce((sum, t) => sum + t.volume7d, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Events (7d)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {triggers.filter(t => t.type === 'zapier' && t.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Zapier Triggers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TriggersTab;
