
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Client } from '@/api/entities';

const parseCSV = (text) => {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return { data };
};

const CsvImportDialog = ({ isOpen, onClose, onImportSuccess, businessId, isInline = false }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setFile(csvFile);
      setError('');
      setSuccessCount(0);
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
      setSuccessCount(0);
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const handleImport = async () => {
    if (!file || !businessId) return;

    setIsUploading(true);
    setError('');
    setSuccessCount(0);

    try {
      const text = await file.text();
      const results = parseCSV(text);
      
      const clientsToCreate = results.data
        .filter(row => row.email)
        .map(row => ({
            business_id: businessId,
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            email: row.email,
            phone: row.phone || '',
        }));

      if (clientsToCreate.length > 0) {
        await Client.bulkCreate(clientsToCreate);
        setSuccessCount(clientsToCreate.length);
        onImportSuccess();
      } else {
        setError("No valid client data found in the CSV.");
      }
    } catch (e) {
      setError(e.message || "An error occurred during import.");
    } finally {
      setIsUploading(false);
    }
  };

  const content = (
    <div className="space-y-6">
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
        
        {successCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm">Successfully imported {successCount} clients.</p>
            </div>
        )}
        
        <div className="flex justify-between items-center pt-4">
             <Button variant="outline">Download Sample CSV</Button>
             <Button onClick={handleImport} disabled={!file || isUploading}>
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : 'Start Import'}
            </Button>
        </div>
    </div>
  );

  if (isInline) {
    return <Card className="rounded-2xl max-w-lg mx-auto"><CardContent className="p-6">{content}</CardContent></Card>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
