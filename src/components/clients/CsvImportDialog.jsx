
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download, Brain, Settings, Eye } from 'lucide-react';

const CsvImportDialog = ({ open, onOpenChange, onImport, loading = false }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // New states for intelligent mapping
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [autoMapping, setAutoMapping] = useState(null);
  const [useIntelligentMapping, setUseIntelligentMapping] = useState(true);
  const [mappingStep, setMappingStep] = useState('upload'); // upload, mapping, preview, importing
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [importProgress, setImportProgress] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setFile(csvFile);
      setError('');
      setImportResult(null);
      processCsvFile(csvFile);
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setError('');
      setImportResult(null);
      processCsvFile(selectedFile);
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const processCsvFile = async (file) => {
    try {
      const csvText = await file.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvData({ headers, rows });
      
      if (useIntelligentMapping) {
        await getAutoMapping(headers, rows.slice(0, 5));
      } else {
        setMappingStep('mapping');
      }
    } catch (error) {
      setError('Error processing CSV file: ' + error.message);
    }
  };

  const getAutoMapping = async (headers, sampleRows) => {
    try {
      setMappingStep('mapping');
      
      const response = await fetch('/api/csv/auto-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, sampleRows })
      });

      if (response.ok) {
        const result = await response.json();
        setAutoMapping(result);
        
        // Initialize column mapping with auto-mapped values
        const mapping = {};
        Object.entries(result.mapping).forEach(([field, header]) => {
          if (header) {
            mapping[field] = header;
          }
        });
        setColumnMapping(mapping);
        
        // Generate preview with current mapping
        generatePreview(mapping);
      } else {
        console.error('Auto-mapping failed, using manual mapping');
        setMappingStep('mapping');
      }
    } catch (error) {
      console.error('Auto-mapping error:', error);
      setMappingStep('mapping');
    }
  };

  const generatePreview = (mapping) => {
    const preview = csvData.rows.slice(0, 5).map(row => {
      const mapped = {};
      Object.entries(mapping).forEach(([field, header]) => {
        if (header && row[header] !== undefined) {
          mapped[field] = row[header];
        }
      });
      return mapped;
    });
    setPreviewData(preview);
  };

  const handleMappingChange = (field, header) => {
    const newMapping = { ...columnMapping, [field]: header };
    setColumnMapping(newMapping);
    generatePreview(newMapping);
  };

  const handleStartImport = async () => {
    if (!file || !columnMapping.full_name) {
      setError('Please select a file and map the full_name column.');
      return;
    }

    setMappingStep('importing');
    setImportProgress(0);
    
    try {
      // Process all rows with the mapping
      const processedRows = csvData.rows.map(row => {
        const processed = {};
        Object.entries(columnMapping).forEach(([field, header]) => {
          if (header && row[header] !== undefined) {
            let value = row[header];
            
            // Normalize values based on field type
            switch (field) {
              case 'email':
                value = value.toLowerCase().trim();
                if (value && !/^\S+@\S+\.\S+$/.test(value)) {
                  value = '';
                }
                break;
              case 'phone':
                value = value.replace(/\D/g, '');
                if (value && value.length < 7) value = '';
                break;
              case 'service_date':
                // Try to normalize date format
                if (value) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    value = date.toISOString().split('T')[0];
                  }
                }
                break;
              case 'tags':
                if (value) {
                  value = value.split(',').map(t => t.trim()).filter(Boolean);
                }
                break;
              default:
                value = value.trim();
            }
            
            processed[field] = value;
          }
        });
        return processed;
      });

      // Import with progress
      const totalRows = processedRows.length;
      let processed = 0;
      
      const result = await onImport(processedRows, (progress) => {
        setImportProgress(progress);
      });
      
      setImportResult(result);
      setMappingStep('complete');
      
    } catch (error) {
      setError('Import failed: ' + error.message);
      setMappingStep('mapping');
    }
  };

  const downloadSampleCsv = () => {
    const sampleData = [
      'full_name,email,phone,service_date,tags,notes,status',
      'John Doe,john@example.com,555-0123,2024-01-15,vip,Great customer,active',
      'Jane Smith,jane@example.com,555-0124,2024-01-20,regular,Follow up needed,active',
      'Bob Johnson,bob@example.com,555-0125,,new,First time customer,active'
    ].join('\n');
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFile(null);
    setError('');
    setImportResult(null);
    setIsUploading(false);
    setCsvData({ headers: [], rows: [] });
    setAutoMapping(null);
    setColumnMapping({});
    setPreviewData([]);
    setMappingStep('upload');
    setImportProgress(0);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={useIntelligentMapping}
            onCheckedChange={setUseIntelligentMapping}
          />
          <Label>Intelligent mapping</Label>
          <Brain className="h-4 w-4 text-blue-500" />
        </div>
        <Button variant="outline" onClick={downloadSampleCsv} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Sample CSV
        </Button>
      </div>

      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('csv-file-input').click()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors bg-white ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input 
          id="csv-file-input"
          type="file" 
          accept=".csv,text/csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-gray-600">
          <Upload className="w-8 h-8 text-gray-400" />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Click to upload or drag and drop</p>
          )}
          <p className="text-xs text-gray-400">CSV files only, max 5MB</p>
        </div>
      </div>

      {file && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
          <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
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

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-600">
        {autoMapping?.usedAI ? (
          <>
            <Brain className="h-5 w-5" />
            <span className="text-sm font-medium">AI-powered mapping available</span>
          </>
        ) : (
          <>
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Heuristic mapping applied</span>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Column Mapping</h3>
        {Object.entries({
          full_name: 'Full Name *',
          email: 'Email',
          phone: 'Phone',
          service_date: 'Service Date',
          tags: 'Tags',
          notes: 'Notes',
          status: 'Status'
        }).map(([field, label]) => (
          <div key={field} className="flex items-center gap-4">
            <Label className="w-24 text-sm">{label}</Label>
            <Select
              value={columnMapping[field] || ''}
              onValueChange={(value) => handleMappingChange(field, value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select column">
                  {columnMapping[field] || "Select column"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No mapping</SelectItem>
                {csvData.headers.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {previewData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <h3 className="font-medium">Preview (first 5 rows)</h3>
          </div>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
            <pre className="text-xs">{JSON.stringify(previewData, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => setMappingStep('upload')}>
          Back
        </Button>
        <Button 
          onClick={handleStartImport} 
          disabled={!columnMapping.full_name}
        >
          Start Import
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
              <div className="font-bold text-blue-600">{importResult.inserted}</div>
              <div className="text-blue-500">New</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-bold text-green-600">{importResult.updated}</div>
              <div className="text-blue-500">Updated</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="font-bold text-yellow-600">{importResult.skipped}</div>
              <div className="text-blue-500">Skipped</div>
            </div>
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg">
              <p className="text-sm font-medium mb-2">Import completed with {importResult.errors.length} errors:</p>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-yellow-600">
                    Row {error.row}: {error.error}
                  </div>
                ))}
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
    switch (mappingStep) {
      case 'upload':
        return renderUploadStep();
      case 'mapping':
        return renderMappingStep();
      case 'importing':
        return renderImportingStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;


