import React, { useState, useEffect } from 'react';
import { Settings, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const JobberConnectionCard = ({ userId, businessId }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionData, setConnectionData] = useState(null);
  const [customerCount, setCustomerCount] = useState(0);

  // Debug logging
  console.log('🔧 JobberConnectionCard props:', { userId, businessId });

  // Check connection status on component mount and when businessId changes
  useEffect(() => {
    checkConnectionStatus();
  }, [businessId]);

  // Also check status when component becomes visible (user navigates back to modal)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, checking Jobber connection status...');
        checkConnectionStatus();
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused, checking Jobber connection status...');
      checkConnectionStatus();
    };

    // Check when page becomes visible or window gains focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [businessId]);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/crm/jobber/status?business_id=${businessId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Jobber connection status check:', data);
        console.log('🔍 Account name from API:', data.account_name);
        console.log('🔍 Connection data from API:', data.connection);
        setConnectionStatus(data.connected ? 'connected' : 'disconnected');
        setConnectionData(data.connection || data);
        
        // Get customer count if connected
        if (data.connected) {
          fetchCustomerCount();
        }
      } else {
        console.error('❌ Status check failed:', response.status);
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('❌ Error checking Jobber connection status:', error);
      setConnectionStatus('error');
    }
  };

  const fetchCustomerCount = async () => {
    try {
      const response = await fetch(`/api/customers/count?business_id=${businessId}&source=jobber`);
      if (response.ok) {
        const data = await response.json();
        setCustomerCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching customer count:', error);
    }
  };

  const handleSyncCustomers = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/crm/jobber/sync-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: businessId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Customer sync successful:', data);
        
        // Update customer count
        setCustomerCount(data.synced || 0);
        
        // Refresh connection status to update last_sync time
        await checkConnectionStatus();
        
        // Show success message (you can add toast notification here)
        alert(`Successfully synced ${data.synced} customers from Jobber!`);
      } else {
        const errorData = await response.json();
        console.error('❌ Sync failed:', errorData);
        alert(`Sync failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error syncing customers:', error);
      alert('Error syncing customers. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async () => {
    console.log('🚀 handleConnect called, current status:', connectionStatus);
    
    // If already connected, don't start OAuth flow
    if (connectionStatus === 'connected') {
      console.log('✅ Already connected to Jobber, skipping OAuth flow');
      return;
    }

    console.log('🔄 Starting OAuth flow...');
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // Start OAuth flow
      const response = await fetch('/api/crm/jobber/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          business_id: businessId,
          user_id: userId 
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Received OAuth URL from server:', data);
        
        if (data.authUrl) {
          console.log('🚀 Opening Jobber OAuth popup:', data.authUrl);
          
          // Open OAuth in popup window (like QBO)
          const authWindow = window.open(
            data.authUrl,
            'jobber-auth',
            'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no'
          );

          // Check if popup was blocked
          if (!authWindow || authWindow.closed || typeof authWindow.closed == 'undefined') {
            console.error('❌ Popup was blocked');
            console.error('❌ Popup blocked - authWindow:', authWindow);
            setConnectionStatus('error');
            setIsConnecting(false);
            return;
          }

          console.log('✅ Popup opened successfully:', authWindow);

          // Listen for success message from popup
          const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'JOBBER_CONNECTED') {
              console.log('🎉 Jobber connection successful!', event.data);
              authWindow.close();
              setIsConnecting(false);
              setConnectionStatus('connected');
              
              // Force refresh status to get updated data
              console.log('🔄 Forcing status refresh after connection...');
              setTimeout(() => {
                checkConnectionStatus();
              }, 500);
              setTimeout(() => {
                checkConnectionStatus();
              }, 2000);
            } else if (event.data.type === 'JOBBER_ERROR') {
              console.error('❌ Jobber connection failed:', event.data.error);
              authWindow.close();
              setConnectionStatus('error');
              setIsConnecting(false);
            }
          };

          window.addEventListener('message', handleMessage);

          // Check if popup is still open every second
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              window.removeEventListener('message', handleMessage);
              setIsConnecting(false);
              console.log('🔄 OAuth popup closed');
            }
          }, 1000);

          // Cleanup listener after 5 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            if (authWindow && !authWindow.closed) {
              authWindow.close();
              setIsConnecting(false);
            }
          }, 300000);

        } else {
          throw new Error('No OAuth URL received from server');
        }
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


  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/crm/jobber/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: businessId })
      });

      if (response.ok) {
        setConnectionStatus('disconnected');
        setConnectionData(null);
        console.log('✅ Successfully disconnected from Jobber');
      } else {
        const errorText = await response.text();
        console.error('❌ Disconnect failed:', response.status, errorText);
        // Try to parse as JSON if possible
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ Parsed error:', errorData);
        } catch (parseError) {
          console.error('❌ Response is not JSON:', errorText);
        }
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Jobber:', error);
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
    <Card className="w-full">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] rounded-lg flex items-center justify-center">
              <img 
                src="/images/crm/Jobber ICON.jpg" 
                alt="Jobber logo"
                className="w-8 h-8 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <Settings className="w-5 h-5 text-white" style={{ display: 'none' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {connectionStatus === 'connected' && connectionData?.account_name 
                  ? connectionData.account_name 
                  : 'Jobber'}
              </h3>
              <p className="text-sm text-gray-600">
                Sync customers and automate review requests
              </p>
              <div className="text-xs text-gray-500 mt-1">
                Business ID: {businessId || 'Not found'}
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="px-6 pb-6 space-y-4">
        {connectionStatus === 'connected' && (
          <div className="space-y-3">
            {/* Account Info */}
            {connectionData && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Connected to Jobber</span>
                  </div>
                  <button
                    onClick={checkConnectionStatus}
                    className="text-green-600 hover:text-green-800 text-xs"
                  >
                    Refresh
                  </button>
                </div>
                <div className="text-sm text-green-700">
                  <div><strong>Account:</strong> {connectionData.account_name || 'Jobber Account'}</div>
                </div>
              </div>
            )}
            
            {/* Manual Status Check Button */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-700">
                  <strong>Status:</strong> {connectionStatus} | <strong>Account:</strong> {connectionData?.account_name || 'Loading...'}
                </div>
                <button
                  onClick={checkConnectionStatus}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Check Status
                </button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{customerCount}</p>
                  <p className="text-xs text-gray-500">Customers Synced</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">
                    {connectionData?.last_sync ? new Date(connectionData.last_sync).toLocaleDateString() : 'Never'}
                  </p>
                  <p className="text-xs text-gray-500">Last Sync</p>
                </div>
              </div>
            </div>
            
            {/* Sync Status */}
            <div className="space-y-2">
              {/* Removed last synced display to match QBO */}
            </div>
            
            {/* Webhook Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Webhook Active</span>
              </div>
              <div className="text-xs text-blue-700">
                <div>Job completions will automatically trigger review requests</div>
                <div className="mt-1 font-mono text-xs">Webhook URL: https://myblipp.com/api/crm/jobber/webhook</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {/* Manual refresh button */}
          <div className="flex justify-end">
            <Button
              onClick={() => checkConnectionStatus()}
              variant="ghost"
              size="sm"
              className="h-8 px-2"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          
          {connectionStatus === 'disconnected' || connectionStatus === 'error' ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || connectionStatus === 'connecting'}
              className="w-full"
            >
              {isConnecting || connectionStatus === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Jobber'
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
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
            </>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Automatically sync customers from Jobber</p>
          <p>• Send review requests when jobs are completed</p>
          <p>• Keep customer data in sync between platforms</p>
        </div>
      </div>
    </Card>
  );
};

export default JobberConnectionCard;
