import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Download,
  Users,
  Eye,
  AlertTriangle
} from "lucide-react";
import { Business, Client, User } from "@/api/entities";
import { motion } from "framer-motion";

const sampleData = [
  { first_name: "John", last_name: "Doe", email: "john@example.com", phone: "+1234567890", service_date: "2024-01-15" },
  { first_name: "Jane", last_name: "Smith", email: "jane@example.com", phone: "+1234567891", service_date: "2024-01-14" },
  { first_name: "Bob", last_name: "Johnson", email: "invalid-email", phone: "", service_date: "2024-01-13" }
];

export default function CsvImportPage() {
  const [business, setBusiness] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef();

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setPreviewData(null);
    setImportResults(null);
    setValidationErrors([]);
    
    // Simulate CSV parsing and preview
    setTimeout(() => {
      setPreviewData(sampleData);
      validateData(sampleData);
    }, 500);
  };

  const validateData = (data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      if (!row.email || !row.email.includes('@')) {
        errors.push({
          row: index + 1,
          field: 'email',
          message: 'Invalid or missing email address',
          severity: 'error'
        });
      }
      
      if (!row.first_name) {
        errors.push({
          row: index + 1,
          field: 'first_name', 
          message: 'First name is required',
          severity: 'error'
        });
      }

      if (!row.phone) {
        errors.push({
          row: index + 1,
          field: 'phone',
          message: 'Phone number missing (optional but recommended for SMS)',
          severity: 'warning'
        });
      }

      if (row.service_date && isNaN(Date.parse(row.service_date))) {
        errors.push({
          row: index + 1,
          field: 'service_date',
          message: 'Invalid date format. Use YYYY-MM-DD',
          severity: 'error'
        });
      }
    });

    setValidationErrors(errors);
  };

  const startImport = async () => {
    if (!previewData) return;
    
    setImporting(true);
    
    // Simulate import process
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        
        const validRows = previewData.filter(row => 
          row.email && row.email.includes('@') && row.first_name
        );
        
        setImportResults({
          total_rows: previewData.length,
          valid_rows: validRows.length,
          invalid_rows: previewData.length - validRows.length,
          errors: validationErrors.filter(e => e.severity === 'error').length,
          warnings: validationErrors.filter(e => e.severity === 'warning').length
        });
        
        setImporting(false);
      }
    }, 300);
  };

  const downloadSample = () => {
    const csvContent = "first_name,last_name,email,phone,service_date\nJohn,Doe,john@example.com,+1234567890,2024-01-15\nJane,Smith,jane@example.com,+1234567891,2024-01-14";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResults(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Import</h1>
          <p className="text-gray-600 mt-1">Import customers from CSV files</p>
        </div>
        <Button variant="outline" onClick={downloadSample}>
          <Download className="w-4 h-4 mr-2" />
          Download Sample
        </Button>
      </div>

      {/* Upload Area */}
      {!file && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Required columns: first_name, email<br/>
                  Optional: last_name, phone, service_date
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {importing && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Customers...</h3>
              <p className="text-gray-600 mb-4">Processing your CSV file</p>
              <Progress value={75} className="w-64 mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Import Complete
                </CardTitle>
                <Button variant="outline" onClick={reset}>
                  <X className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{importResults.total_rows}</p>
                  <p className="text-sm text-blue-700">Total Rows</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResults.valid_rows}</p>
                  <p className="text-sm text-green-700">Valid Customers</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{importResults.invalid_rows}</p>
                  <p className="text-sm text-red-700">Invalid Rows</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{importResults.warnings}</p>
                  <p className="text-sm text-yellow-700">Warnings</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Successfully imported {importResults.valid_rows} customers into your database.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  View Customers
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Preview */}
      {previewData && !importing && !importResults && (
        <div className="space-y-6">
          {/* Validation Summary */}
          {validationErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Validation Issues ({validationErrors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {error.severity === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">Row {error.row}:</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Data Preview
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset}>
                    Cancel
                  </Button>
                  <Button onClick={startImport} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => {
                    const hasErrors = validationErrors.some(e => e.row === index + 1 && e.severity === 'error');
                    const hasWarnings = validationErrors.some(e => e.row === index + 1 && e.severity === 'warning');
                    
                    return (
                      <TableRow key={index} className={hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-yellow-50' : ''}>
                        <TableCell>{row.first_name}</TableCell>
                        <TableCell>{row.last_name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.service_date}</TableCell>
                        <TableCell>
                          {hasErrors ? (
                            <Badge className="bg-red-100 text-red-800">Error</Badge>
                          ) : hasWarnings ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Valid</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
