import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const GoogleOAuthConnection = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Get business ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setIsChecking(false);
        return;
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('created_by', user.email)
        .limit(1)
        .single();

      if (businessData?.id) {
        setBusinessId(businessData.id);
        
        // Check Google OAuth status
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/google/oauth/status?business_id=${businessData.id}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });

        const data = await response.json();
        setIsConnected(data.connected && data.token_valid);
        
        if (onConnectionChange) {
          onConnectionChange(data.connected && data.token_valid);
        }
      }
    } catch (error) {
      console.error('Error checking Google OAuth status:', error);
      setError('Failed to check connection status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/oauth/authorize?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${authSession?.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.auth_url) {
        // Open OAuth flow in new window
        const authWindow = window.open(data.auth_url, 'google-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
        // Poll for window closure
        const pollTimer = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(pollTimer);
            // Check connection status after OAuth flow
            setTimeout(checkConnectionStatus, 1000);
          }
        }, 1000);
      } else {
        setError(data.error || 'Failed to initiate Google OAuth');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      setError('Failed to connect to Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session: disconnectSession } } = await supabase.auth.getSession();
      const response = await fetch('/api/google/oauth/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${disconnectSession?.access_token}`
        },
        body: JSON.stringify({ business_id: businessId })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsConnected(false);
        if (onConnectionChange) {
          onConnectionChange(false);
        }
      } else {
        setError(data.error || 'Failed to disconnect Google account');
      }
    } catch (error) {
      console.error('Error disconnecting from Google:', error);
      setError('Failed to disconnect from Google');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Checking Google connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <img 
            src="https://developers.google.com/identity/images/g-logo.png" 
            alt="Google" 
            className="w-6 h-6"
          />
          <span>Google My Business</span>
        </CardTitle>
        <CardDescription>
          Connect your Google My Business account to respond to reviews directly from Blipp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">Connected</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Not Connected</span>
                <Badge variant="outline">
                  Inactive
                </Badge>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://business.google.com/', '_blank')}
                  className="flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Google My Business</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <img 
                      src="https://developers.google.com/identity/images/g-logo.png" 
                      alt="Google" 
                      className="w-4 h-4"
                    />
                    <span>Connect Google Account</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ Your Google My Business account is connected! You can now respond to Google reviews directly from Blipp.
            </p>
          </div>
        )}

        {!isConnected && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Connect your Google My Business account to enable direct reply functionality for Google reviews.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleOAuthConnection;
