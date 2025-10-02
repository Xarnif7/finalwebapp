import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Loader2, FileSpreadsheet, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentBusinessId } from '../../hooks/useCurrentBusinessId';
import { supabase } from '../../lib/supabase/browser';
import toast from 'react-hot-toast';

const GoogleSheetsDialog = ({ open, onOpenChange, onImport, loading }) => {
  const { user } = useAuth();
  const { businessId } = useCurrentBusinessId();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState('connect'); // connect, select, preview, importing, complete
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState('');
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [syncSettings, setSyncSettings] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (open) {
      getSession();
      checkConnectionStatus();
      fetchSyncSettings();
    }
  }, [open]);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/google/sheets/status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.connected) {
        setIsConnected(true);
        setStep('select');
        await fetchSpreadsheets();
      } else {
        setIsConnected(false);
        setStep('connect');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
      setStep('connect');
    }
  };

  const fetchSyncSettings = async () => {
    try {
      const response = await fetch('/api/google/sheets/sync-settings', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.settings) {
        setSyncSettings(data.settings);
        setAutoSyncEnabled(data.settings.auto_sync_enabled);
      }
    } catch (error) {
      console.error('Error fetching sync settings:', error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const response = await fetch('/api/google/sheets/auth', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      setError(error.message || 'Failed to connect to Google Sheets');
      setIsConnecting(false);
    }
  };

  const fetchSpreadsheets = async () => {
    try {
      const response = await fetch('/api/google/sheets/list', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.spreadsheets) {
        setSpreadsheets(data.spreadsheets);
      } else {
        throw new Error(data.error || 'Failed to fetch spreadsheets');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch spreadsheets');
    }
  };

  const fetchSheetNames = async (spreadsheetId) => {
    try {
      const response = await fetch(`/api/google/sheets/sheets?spreadsheetId=${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      
      if (data.sheets) {
        setSheetNames(data.sheets);
      } else {
        throw new Error(data.error || 'Failed to fetch sheet names');
      }
    } catch (error) {
      setError(error.message || 'Failed to fetch sheet names');
    }
  };

  const handleSpreadsheetChange = async (spreadsheetId) => {
    setSelectedSpreadsheet(spreadsheetId);
    await fetchSheetNames(spreadsheetId);
  };

  const handlePreviewData = async () => {
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/google/sheets/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheetId: selectedSpreadsheet,
          sheetName: selectedSheet,
        }),
      });

      const data = await response.json();

      if (data.preview) {
        setPreviewData(data.preview);
        setStep('preview');
      } else {
        throw new Error(data.error || 'Failed to preview data');
      }
    } catch (error) {
      setError(error.message || 'Failed to preview data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('importing');
    setImportProgress(0);

    try {
      const response = await fetch('/api/google/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheetId: selectedSpreadsheet,
          sheetName: selectedSheet,
          autoEnroll: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data);
        setStep('complete');
        onImport(data);
      } else {
        throw new Error(data.error || 'Failed to import data');
      }
    } catch (error) {
      setError(error.message || 'Failed to import data');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResync = async () => {
    if (!syncSettings) {
      setError('No sync settings found');
      return;
    }

    setIsResyncing(true);
    setError('');

    try {
      const response = await fetch('/api/google/sheets/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheetId: syncSettings.spreadsheet_id,
          sheetName: syncSettings.sheet_name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Resync completed: ${data.customers_imported} imported, ${data.skipped} skipped`);
        onImport(data);
      } else {
        throw new Error(data.error || 'Failed to resync data');
      }
    } catch (error) {
      setError(error.message || 'Failed to resync data');
      toast.error(error.message || 'Failed to resync data');
    } finally {
      setIsResyncing(false);
    }
  };

  const saveSyncSettings = async () => {
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet');
      return;
    }

    try {
      const response = await fetch('/api/google/sheets/sync-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheetId: selectedSpreadsheet,
          sheetName: selectedSheet,
          autoSyncEnabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncSettings(data.settings);
        toast.success('Sync settings saved successfully');
      } else {
        throw new Error(data.error || 'Failed to save sync settings');
      }
    } catch (error) {
      setError(error.message || 'Failed to save sync settings');
      toast.error(error.message || 'Failed to save sync settings');
    }
  };

  const resetForm = () => {
    setStep('connect');
    setError('');
    setImportResult(null);
    setSpreadsheets([]);
    setSelectedSpreadsheet('');
    setSelectedSheet('');
    setSheetNames([]);
    setPreviewData([]);
    setImportProgress(0);
    setIsResyncing(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Integration
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {step === 'connect' && (
          <div className="space-y-6">
            <div className="text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect to Google Sheets</h3>
              <p className="text-gray-600 mb-6">
                Connect your Google account to import customers from Google Sheets
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Google Sheets
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Select Spreadsheet</h3>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Choose a spreadsheet</label>
                <Select value={selectedSpreadsheet} onValueChange={handleSpreadsheetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a spreadsheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {spreadsheets.map((spreadsheet) => (
                      <SelectItem key={spreadsheet.id} value={spreadsheet.id}>
                        {spreadsheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSpreadsheet && sheetNames.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Choose a sheet</label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sheet" />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((sheet) => (
                        <SelectItem key={sheet} value={sheet}>
                          {sheet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedSpreadsheet && selectedSheet && (
                <Button
                  onClick={handlePreviewData}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading Preview...
                    </>
                  ) : (
                    'Preview Data'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview Data</h3>
              <Badge variant="outline">
                {previewData.length} rows found
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data Preview</CardTitle>
                <CardDescription>
                  Found {previewData.length} rows. Here's a preview of the first 5:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(previewData.slice(0, 5), null, 2)}
                </pre>
              </CardContent>
            </Card>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Auto-sync Settings</h3>
                  <Switch
                    checked={autoSyncEnabled}
                    onCheckedChange={setAutoSyncEnabled}
                  />
                </div>
              </div>

              {autoSyncEnabled && (
                <div className="pl-6 border-l-2 border-green-200 bg-green-50/30 p-4 rounded-r-lg">
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Auto-sync enabled:</strong> Changes to your Google Sheet will automatically sync to Blipp.
                  </p>
                  <p className="text-xs text-green-600">
                    This will monitor your sheet for changes and update your customer database in real-time.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Customers'
                )}
              </Button>
              <Button
                onClick={saveSyncSettings}
                disabled={isLoading}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 text-center">
            <Loader2 className="h-16 w-16 mx-auto animate-spin text-blue-500" />
            <h3 className="text-lg font-semibold">Importing Customers</h3>
            <p className="text-gray-600">Please wait while we import your data...</p>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}

        {step === 'complete' && importResult && (
          <div className="space-y-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">Import Complete!</h3>
            <div className="space-y-2">
              <p className="text-gray-600">
                Successfully imported <strong>{importResult.customers_imported}</strong> customers
              </p>
              {importResult.skipped > 0 && (
                <p className="text-gray-500">
                  Skipped <strong>{importResult.skipped}</strong> duplicates
                </p>
              )}
              {importResult.enrollmentSummary && (
                <p className="text-gray-500">
                  Auto-enrolled <strong>{importResult.enrollmentSummary.enrolled}</strong> customers
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {syncSettings && (
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Quick Actions</h3>
              <Button 
                onClick={handleResync}
                disabled={isResyncing}
                variant="outline"
                size="sm"
              >
                {isResyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resyncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resync
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Connected to: <strong>{syncSettings.spreadsheet_name}</strong> - {syncSettings.sheet_name}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsDialog;
