import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Settings,
  Eye,
  Link
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCurrentBusinessId } from '@/lib/tenancy';
import { supabase } from '@/lib/supabase/browser';
import { toast } from 'react-hot-toast';

const GoogleSheetsDialog = ({ open, onOpenChange, onImport, loading = false }) => {
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
  
  // Auto-enroll states
  const [autoEnrollEnabled, setAutoEnrollEnabled] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState('');
  const [availableSequences, setAvailableSequences] = useState([]);

  // Check connection status on mount
  useEffect(() => {
    if (open && businessId) {
      checkConnectionStatus();
    }
  }, [open, businessId]);

  // Fetch available sequences for auto-enroll
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        const response = await fetch('/api/sequences', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableSequences(data.sequences || []);
          if (data.sequences && data.sequences.length > 0) {
            setSelectedSequence(data.sequences[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching sequences:', error);
      }
    };

    if (autoEnrollEnabled) {
      fetchSequences();
    }
  }, [autoEnrollEnabled]);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/status?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      setIsConnected(data.connected && data.token_valid);
      
      if (data.connected && data.token_valid) {
        setStep('select');
        await fetchSpreadsheets();
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setError('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/auth?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.auth_url) {
        // Open OAuth flow in new window
        const authWindow = window.open(data.auth_url, 'google-sheets-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
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
      console.error('Error connecting to Google Sheets:', error);
      setError('Failed to connect to Google Sheets');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchSpreadsheets = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/list?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        setSpreadsheets(data.spreadsheets);
        if (data.spreadsheets.length > 0) {
          setSelectedSpreadsheet(data.spreadsheets[0].id);
          await fetchSheetNames(data.spreadsheets[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch spreadsheets');
      }
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      setError('Failed to fetch spreadsheets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSheetNames = async (spreadsheetId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/sheets?business_id=${businessId}&spreadsheet_id=${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        setSheetNames(data.sheets);
        if (data.sheets.length > 0) {
          setSelectedSheet(data.sheets[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching sheet names:', error);
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

    try {
      setIsLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/google/sheets/preview?business_id=${businessId}&spreadsheet_id=${selectedSpreadsheet}&sheet_name=${selectedSheet}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        setPreviewData(data.preview);
        setStep('preview');
      } else {
        setError(data.error || 'Failed to preview data');
      }
    } catch (error) {
      console.error('Error previewing data:', error);
      setError('Failed to preview data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet');
      return;
    }

    setStep('importing');
    setImportProgress(0);
    
    try {
      // Prepare auto-enroll parameters if enabled
      const autoEnrollParams = autoEnrollEnabled ? {
        enabled: true,
        sequence_id: selectedSequence
      } : null;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/google/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheet_id: selectedSpreadsheet,
          sheet_name: selectedSheet,
          business_id,
          auto_enroll: autoEnrollParams
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        setImportResult(data);
        setStep('complete');
        
        // Save sync settings if auto-sync is enabled
        if (autoSyncEnabled) {
          await saveSyncSettings();
        }
        
        // Call the parent import handler
        if (onImport) {
          await onImport(data);
        }
      } else {
        setError(data.error || 'Import failed');
        setStep('preview');
      }
    } catch (error) {
      console.error('Error importing from Google Sheets:', error);
      setError('Import failed: ' + error.message);
      setStep('preview');
    }
  };

  const handleResync = async () => {
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet');
      return;
    }

    setIsResyncing(true);
    setError('');
    
    try {
      // Prepare auto-enroll parameters if enabled
      const autoEnrollParams = autoEnrollEnabled ? {
        enabled: true,
        sequence_id: selectedSequence
      } : null;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/google/sheets/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          spreadsheet_id: selectedSpreadsheet,
          sheet_name: selectedSheet,
          business_id,
          auto_enroll: autoEnrollParams
        })
      });

      const data = await response.json();
      
      if (data.ok) {
        let message = `Resync completed: ${data.customers_imported} new, ${data.customers_updated} updated, ${data.customers_skipped} skipped`;
        
        if (data.enrollmentSummary) {
          const { enrolled, skipped } = data.enrollmentSummary;
          message += ` | Auto-enrollment: ${enrolled} enrolled, ${skipped} skipped`;
        }
        
        toast.success(message);
        
        // Call the parent import handler
        if (onImport) {
          await onImport(data);
        }
      } else {
        setError(data.error || 'Resync failed');
      }
    } catch (error) {
      console.error('Error resyncing from Google Sheets:', error);
      setError('Resync failed: ' + error.message);
    } finally {
      setIsResyncing(false);
    }
  };

  const saveSyncSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/google/sheets/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          business_id,
          spreadsheet_id: selectedSpreadsheet,
          sheet_name: selectedSheet,
          auto_sync_enabled: autoSyncEnabled
        })
      });
    } catch (error) {
      console.error('Error saving sync settings:', error);
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
        setSyncSettings(data.settings);
        setAutoSyncEnabled(data.settings?.auto_sync_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching sync settings:', error);
    }
  };

  const resetForm = () => {
    setError('');
    setImportResult(null);
    setIsLoading(false);
    setIsConnecting(false);
    setStep('connect');
    setSelectedSpreadsheet('');
    setSelectedSheet('');
    setSheetNames([]);
    setPreviewData([]);
    setImportProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const renderConnectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h3 className="text-lg font-medium mb-2">Connect Google Sheets</h3>
        <p className="text-sm text-gray-600 mb-6">
          Connect your Google account to sync customers from Google Sheets
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : isConnected ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Google Sheets is connected!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect Google Sheets
              </>
            )}
          </Button>
          
          <div className="text-xs text-gray-500 text-center">
            You'll be redirected to Google to authorize access to your sheets
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Spreadsheet</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSpreadsheets}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Choose a spreadsheet</Label>
          <Select
            value={selectedSpreadsheet}
            onValueChange={handleSpreadsheetChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spreadsheet" />
            </SelectTrigger>
            <SelectContent>
              {spreadsheets.map(sheet => (
                <SelectItem key={sheet.id} value={sheet.id}>
                  {sheet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {sheetNames.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Choose a sheet</Label>
            <Select
              value={selectedSheet}
              onValueChange={setSelectedSheet}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheetNames.map(sheet => (
                  <SelectItem key={sheet} value={sheet}>
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Auto-sync Section */}
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

      {/* Auto-enroll Section */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Auto-enroll in Automation</h3>
            <Switch
              checked={autoEnrollEnabled}
              onCheckedChange={setAutoEnrollEnabled}
            />
          </div>
        </div>

        {autoEnrollEnabled && (
          <div className="space-y-4 pl-6 border-l-2 border-blue-200 bg-blue-50/30 p-4 rounded-r-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose Sequence</Label>
              <Select
                value={selectedSequence}
                onValueChange={setSelectedSequence}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sequence">
                    {availableSequences.find(s => s.id === selectedSequence)?.name || "Select sequence"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSequences.map(sequence => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      {sequence.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-gray-600 bg-white p-3 rounded border">
              <strong>Note:</strong> Customers will be automatically enrolled in the selected sequence if they have a valid email address.
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep('connect')}>
          Back
        </Button>
        <Button 
          onClick={handlePreviewData}
          disabled={!selectedSpreadsheet || !selectedSheet || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview Data
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-medium">Preview Data</h3>
      </div>

      {previewData.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Found {previewData.length} rows. Here's a preview of the first 5:
          </p>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
            <pre className="text-xs">{JSON.stringify(previewData.slice(0, 5), null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep('select')}>
          Back
        </Button>
        <Button 
          onClick={handleResync}
          disabled={isResyncing}
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
              Resync
            </>
          )}
        </Button>
        <Button onClick={handleImport}>
          Import Customers
        </Button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        <h3 className="font-medium mb-2">Importing customers...</h3>
        <Progress value={importProgress} className="w-full" />
        <p className="text-sm text-gray-500 mt-2">{Math.round(importProgress)}% complete</p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      {importResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">Import completed successfully!</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-bold text-blue-600">{importResult.customers_imported}</div>
              <div className="text-blue-500">Imported</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="font-bold text-yellow-600">{importResult.skipped}</div>
              <div className="text-yellow-500">Skipped</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-bold text-gray-600">{importResult.total_rows}</div>
              <div className="text-gray-500">Total Rows</div>
            </div>
          </div>

          {importResult.enrollmentSummary && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Auto-enrollment Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="font-bold text-green-600 text-lg">{importResult.enrollmentSummary.enrolled}</div>
                  <div className="text-green-500">Enrolled</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="font-bold text-yellow-600 text-lg">{importResult.enrollmentSummary.skipped}</div>
                  <div className="text-yellow-500">Skipped</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-center pt-4">
        <Button onClick={handleClose}>
          Done
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (step) {
      case 'connect':
        return renderConnectStep();
      case 'select':
        return renderSelectStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderConnectStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers from Google Sheets</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsDialog;
