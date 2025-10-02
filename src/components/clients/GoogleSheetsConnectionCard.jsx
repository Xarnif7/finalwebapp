import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCurrentBusinessId } from '@/lib/tenancy';
import { supabase } from '@/lib/supabase/browser';
import { toast } from 'react-hot-toast';

const GoogleSheetsConnectionCard = ({ onResync }) => {
  const { user } = useAuth();
  const { businessId } = useCurrentBusinessId();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncSettings, setSyncSettings] = useState(null);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (businessId) {
      checkConnectionStatus();
      fetchSyncSettings();
    }
  }, [businessId]);

  const checkConnectionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/status?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      setIsConnected(data.connected && data.token_valid);
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/sync-settings?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSyncSettings(data.settings?.[0] || null);
      }
    } catch (error) {
      console.error('Error fetching sync settings:', error);
    }
  };

  const handleResync = async () => {
    if (!syncSettings) return;

    setIsResyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/google/sheets/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          business_id,
          spreadsheet_id: syncSettings.spreadsheet_id,
          sheet_name: syncSettings.sheet_name
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        let message = `Resync completed: ${data.customers_imported} new, ${data.customers_updated} updated, ${data.customers_skipped} skipped`;
        toast.success(message);
        
        if (onResync) {
          onResync(data);
        }
      } else {
        toast.error(data.error || 'Resync failed');
      }
    } catch (error) {
      console.error('Error resyncing:', error);
      toast.error('Resync failed: ' + error.message);
    } finally {
      setIsResyncing(false);
    }
  };

  const handleToggleAutoSync = async (enabled) => {
    if (!syncSettings) return;

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/google/sheets/sync-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          business_id,
          spreadsheet_id: syncSettings.spreadsheet_id,
          sheet_name: syncSettings.sheet_name,
          auto_sync_enabled: enabled
        })
      });

      if (response.ok) {
        setSyncSettings(prev => ({ ...prev, auto_sync_enabled: enabled }));
        toast.success(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
      } else {
        toast.error('Failed to update auto-sync settings');
      }
    } catch (error) {
      console.error('Error updating auto-sync:', error);
      toast.error('Failed to update auto-sync settings');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return null; // Don't show the card if not connected
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-500" />
          Google Sheets Connected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncSettings ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{syncSettings.sheet_name}</p>
                <p className="text-sm text-gray-500">Spreadsheet ID: {syncSettings.spreadsheet_id.slice(0, 20)}...</p>
              </div>
              <Badge variant={syncSettings.auto_sync_enabled ? "default" : "secondary"}>
                {syncSettings.auto_sync_enabled ? "Auto-sync ON" : "Auto-sync OFF"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={syncSettings.auto_sync_enabled}
                  onCheckedChange={handleToggleAutoSync}
                  disabled={isUpdating}
                />
                <span className="text-sm">Auto-sync changes</span>
              </div>
              <Button
                onClick={handleResync}
                disabled={isResyncing}
                size="sm"
                variant="outline"
              >
                {isResyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resyncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resync Now
                  </>
                )}
              </Button>
            </div>

            {syncSettings.last_sync_at && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(syncSettings.last_sync_at).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">No sync settings found</p>
            <p className="text-xs text-gray-400">
              Import from Google Sheets to set up auto-sync
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsConnectionCard;
