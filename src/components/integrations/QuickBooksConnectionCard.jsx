import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, ExternalLink, Users, RefreshCw, CheckCircle, XCircle, Send } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useBusiness } from '../../hooks/useBusiness';

const QuickBooksConnectionCard = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastSync, setLastSync] = useState(null);
  const [lastWebhook, setLastWebhook] = useState(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const { toast } = useToast();
  const { business } = useBusiness();

  // Safe JSON helper function
  const safeJsonFetch = async (url, options = {}) => {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON, got ${response.status}: ${text.slice(0, 200)}`);
    }
    
    return await response.json();
  };

  // Check if QBO V2 is enabled
  const isQboV2Enabled = import.meta.env.VITE_QBO_V2_ENABLED === 'true';

  // Check connection status on mount and periodically
  useEffect(() => {
    checkConnectionStatus();
    
    // Set up periodic status checks every 30 seconds
    const interval = setInterval(() => {
      checkConnectionStatus(false); // Don't show toast on periodic checks
    }, 30000);
    
    return () => clearInterval(interval);
  }, [business?.id]);

  // Re-check status when business changes
  useEffect(() => {
    if (business?.id) {
      checkConnectionStatus();
    }
  }, [business?.id]);

  const checkConnectionStatus = async (showToast = true) => {
    if (!business?.id) {
      setConnectionStatus('disconnected');
      setIsCheckingStatus(false);
      return;
    }

    try {
      setIsCheckingStatus(true);
      const data = await safeJsonFetch(`/api/quickbooks/status?business_id=${business.id}`);
      
      console.log('🔍 QuickBooks status response:', data);
      
      const wasConnected = connectionStatus === 'connected';
      const isNowConnected = data.connected;
      
      setConnectionStatus(isNowConnected ? 'connected' : 'disconnected');
      setLastSync(data.lastFullSyncAt);
      setLastWebhook(data.lastWebhookAt);
      setCustomerCount(data.customerCount || 0);
      setConnectionError(data.error || null);
      setCompanyInfo(data.company || null);
      setIntegrations(data.integrations || []);
      
      // Only show success toast when connecting for the first time
      if (showToast && isNowConnected && !wasConnected) {
        toast({
          title: "QuickBooks Connected!",
          description: `Successfully connected to QuickBooks with ${data.customerCount || 0} customers`,
          variant: "default"
        });
      }
      
      if (showToast && data.error) {
        toast({
          title: "Connection Check Failed",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking QuickBooks status:', error);
      setConnectionStatus('error');
      if (showToast) {
        toast({
          title: "Connection Error",
          description: "Failed to check QuickBooks connection status",
          variant: "destructive"
        });
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnect = () => {
    if (!business?.id) {
      toast({
        title: "Error",
        description: "Business ID not found",
        variant: "destructive"
      });
      return;
    }

    // Use window.location.href for OAuth redirect (not fetch)
    const connectUrl = `/api/quickbooks/connect?business_id=${business.id}`;
    console.log('🔗 QuickBooks Connect URL:', connectUrl);
    
    // Redirect to OAuth flow
    window.location.href = connectUrl;
  };

  const handleSyncCustomers = async () => {
    if (!business?.id) return;

    setIsSyncing(true);

    try {
      const data = await safeJsonFetch('/api/quickbooks/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      if (data.queued) {
        toast({
          title: "Sync Queued",
          description: `Successfully queued sync for ${data.synced_count || 0} customers from QuickBooks`
        });
        setLastSync(new Date().toISOString());
        setCustomerCount(data.synced_count || 0);
        // Refresh status to get updated counts
        checkConnectionStatus(false);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('QuickBooks sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync customers from QuickBooks",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!business?.id) return;

    try {
      const data = await safeJsonFetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      if (data.disconnected) {
        setConnectionStatus('disconnected');
        setLastSync(null);
        setLastWebhook(null);
        setCustomerCount(0);
        setIntegrations([]);
        toast({
          title: "Disconnected",
          description: "QuickBooks has been disconnected"
        });
      } else {
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error) {
      console.error('QuickBooks disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect QuickBooks",
        variant: "destructive"
      });
    }
  };

  const handleTriggerReviewRequests = async () => {
    if (!business?.id) return;

    try {
      const data = await safeJsonFetch('/api/quickbooks/trigger-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      if (data.success) {
        toast({
          title: "Review Requests Sent!",
          description: `Sent review requests to ${data.sent_count} QuickBooks customers`
        });
      } else {
        throw new Error(data.error || 'Failed to send review requests');
      }
    } catch (error) {
      console.error('QuickBooks trigger reviews error:', error);
      toast({
        title: "Error",
        description: "Failed to send review requests",
        variant: "destructive"
      });
    }
  };

  const handlePingTest = async () => {
    if (!business?.id) return;

    try {
      const data = await safeJsonFetch(`/api/qbo/ping?business_id=${business.id}`);

      if (data.success) {
        toast({
          title: "API Test Successful!",
          description: `Found ${data.customers_found} customers in realm ${data.realm_id}`,
          variant: "default"
        });
      } else {
        toast({
          title: "API Test Failed",
          description: data.error || "Failed to test QuickBooks API connection",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('QuickBooks ping test error:', error);
      toast({
        title: "API Test Error",
        description: "Failed to test QuickBooks API connection",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = () => {
    if (isCheckingStatus) {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Checking...</Badge>;
    }
    
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Not Connected</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Not Connected</Badge>;
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Don't render if QBO V2 is not enabled
  if (!isQboV2Enabled) {
    return null;
  }

  return (
    <Card className="w-full">
      {/* Reconnection Banner */}
      {(connectionStatus === 'expired' || connectionStatus === 'revoked') && (
        <div className="bg-orange-50 border-b border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  QuickBooks connection {connectionStatus === 'expired' ? 'expired' : 'revoked'}
                </p>
                <p className="text-xs text-orange-700">
                  Your tokens have expired or been revoked. Please reconnect to continue syncing.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  'Reconnect QuickBooks'
                )}
              </Button>
              <Button 
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">QuickBooks</CardTitle>
              <CardDescription>Sync customers and automate review requests</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connectionStatus === 'connected' && (
          <div className="space-y-3">
            {/* Company Info */}
            {companyInfo && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Connected to QuickBooks</span>
                </div>
                <div className="text-sm text-green-700">
                  <div><strong>Company:</strong> {companyInfo.name || 'QuickBooks Company'}</div>
                  {companyInfo.realmId && (
                    <div><strong>Realm ID:</strong> {companyInfo.realmId}</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{customerCount}</p>
                  <p className="text-xs text-gray-500">Customers Synced</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{formatLastSync(lastSync)}</p>
                  <p className="text-xs text-gray-500">Last Sync</p>
                </div>
              </div>
            </div>
            
            {/* Sync Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last synced:</span>
                <span className="font-medium">{formatLastSync(lastSync)}</span>
              </div>
              {lastWebhook && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last webhook:</span>
                  <span className="font-medium">{formatLastSync(lastWebhook)}</span>
                </div>
              )}
            </div>
            
            {/* Webhook Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Webhook Active</span>
              </div>
              <div className="text-xs text-blue-700">
                <div>Invoice payments and sends will automatically trigger review requests</div>
                <div className="mt-1 font-mono text-xs">Webhook URL: /api/qbo/webhook</div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Connection Error</span>
            </div>
            <div className="text-sm text-red-700">{connectionError}</div>
            <div className="mt-2">
              <Button 
                onClick={() => checkConnectionStatus(true)}
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Connection
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {/* Manual refresh button */}
          <div className="flex justify-end">
            <Button
              onClick={() => checkConnectionStatus(true)}
              disabled={isCheckingStatus}
              variant="ghost"
              size="sm"
              className="h-8 px-2"
            >
              {isCheckingStatus ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </div>
          
          {connectionStatus === 'disconnected' || connectionStatus === 'checking' ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || isCheckingStatus}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : isCheckingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                'Connect QuickBooks'
              )}
            </Button>
          ) : (
            <>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSyncCustomers} 
                  disabled={isSyncing}
                  variant="outline"
                  className="flex-1"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleDisconnect} 
                  variant="outline"
                  size="sm"
                >
                  Disconnect
                </Button>
              </div>
              
              {customerCount > 0 && (
                <Button 
                  onClick={handleTriggerReviewRequests}
                  className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:from-[#6D28D9] hover:to-[#1D4ED8] text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Review Requests to {customerCount} Customers
                </Button>
              )}
              
              {/* Dev Test Button */}
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  onClick={handlePingTest}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Test API Connection
                </Button>
              )}
            </>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Automatically sync customers from QuickBooks</p>
          <p>• Send review requests when invoices are paid</p>
          <p>• Keep customer data in sync between platforms</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickBooksConnectionCard;

