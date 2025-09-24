import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const JobberConnectionCard = ({ userId, businessId }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState(null);

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, [businessId]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/crm/jobber/status?businessId=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        setConnectionData(data);
      }
    } catch (error) {
      console.error('Error checking Jobber connection status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Start OAuth flow
      const response = await fetch('/api/crm/jobber/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ 
          businessId,
          userId 
        })
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Open OAuth flow in new window
        window.open(authUrl, 'jobber-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        // Poll for connection completion
        pollForConnection();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Jobber connection API error:', errorData);
        throw new Error(errorData.error || 'Failed to initiate Jobber connection');
      }
    } catch (error) {
      console.error('Error connecting to Jobber:', error);
      setConnectionStatus('error');
      setIsConnecting(false);
    }
  };

  const pollForConnection = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/crm/jobber/status?businessId=${businessId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.connected) {
            setConnectionStatus('connected');
            setConnectionData(data);
            setIsConnecting(false);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling connection status:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (connectionStatus === 'connecting') {
        setConnectionStatus('error');
        setIsConnecting(false);
      }
    }, 300000);
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/crm/jobber/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ businessId })
      });

      if (response.ok) {
        setConnectionStatus('disconnected');
        setConnectionData(null);
      }
    } catch (error) {
      console.error('Error disconnecting from Jobber:', error);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Connecting...</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Connection Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Connected</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect Jobber CRM</h3>
              <p className="text-sm text-gray-600">
                Automatically send review requests when jobs are completed
              </p>
              {connectionData && (
                <div className="mt-2 flex items-center space-x-2">
                  {getStatusIcon()}
                  {getStatusBadge()}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {connectionStatus === 'connected' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://app.getjobber.com', '_blank')}
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open Jobber</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-700"
                >
                  Disconnect
                </Button>
              </>
            )}
            
            {connectionStatus !== 'connected' && (
              <Button
                onClick={handleConnect}
                disabled={isConnecting || connectionStatus === 'connecting'}
                className="bg-gradient-to-r from-[#FF6B35] to-[#F7931E] hover:from-[#E55A2B] hover:to-[#E8851A] text-white"
              >
                {isConnecting || connectionStatus === 'connecting' ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Connect Jobber
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {connectionStatus === 'connected' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Jobber Connected Successfully!</h4>
                <p className="text-sm text-green-700 mt-1">
                  When you mark jobs as completed in Jobber, Blipp will automatically send review requests to your customers.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Last synced: {connectionData?.lastSync ? new Date(connectionData.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                <p className="text-sm text-red-700 mt-1">
                  There was an error connecting to Jobber. Please try again.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobberConnectionCard;
