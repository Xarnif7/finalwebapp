import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, ExternalLink, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useBusiness } from '../../hooks/useBusiness';

const QuickBooksConnectionCard = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSync, setLastSync] = useState(null);
  const [customerCount, setCustomerCount] = useState(0);
  const { toast } = useToast();
  const { business } = useBusiness();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    if (!business?.id) return;

    try {
      const response = await fetch(`/api/quickbooks/status?business_id=${business.id}`);
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        setLastSync(data.last_sync_at);
        setCustomerCount(data.customer_count || 0);
      }
    } catch (error) {
      console.error('Error checking QuickBooks status:', error);
    }
  };

  const handleConnect = async () => {
    if (!business?.id) {
      toast({
        title: "Error",
        description: "Business ID not found",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Generate QuickBooks OAuth URL
      const clientId = process.env.VITE_QUICKBOOKS_CLIENT_ID;
      
      if (!clientId) {
        throw new Error('QuickBooks Client ID not configured. Please check environment variables.');
      }
      
      const redirectUri = `${window.location.origin}/api/quickbooks/callback`;
      const scope = 'com.intuit.quickbooks.accounting';
      const state = business.id;

      const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
      
      console.log('🔗 QuickBooks OAuth URL:', authUrl);

      // Open OAuth window
      const authWindow = window.open(
        authUrl,
        'quickbooks-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for success message
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'QUICKBOOKS_CONNECTED') {
          authWindow.close();
          setIsConnecting(false);
          setConnectionStatus('connected');
          toast({
            title: "Success",
            description: "QuickBooks connected successfully!"
          });
          checkConnectionStatus();
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup listener after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
          setIsConnecting(false);
        }
      }, 300000);

    } catch (error) {
      console.error('QuickBooks connection error:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to QuickBooks. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSyncCustomers = async () => {
    if (!business?.id) return;

    setIsSyncing(true);

    try {
      const response = await fetch('/api/quickbooks/sync-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.synced_count} customers from QuickBooks`
        });
        setLastSync(new Date().toISOString());
        setCustomerCount(prev => prev + data.synced_count);
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
      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: business.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('disconnected');
        setLastSync(null);
        setCustomerCount(0);
        toast({
          title: "Disconnected",
          description: "QuickBooks has been disconnected"
        });
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

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Not Connected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
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

  return (
    <Card className="w-full">
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
        )}

        <div className="flex space-x-2">
          {connectionStatus === 'disconnected' ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect QuickBooks'
              )}
            </Button>
          ) : (
            <>
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
                    Sync Customers
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
