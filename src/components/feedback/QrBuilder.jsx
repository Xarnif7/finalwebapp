import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import { QrCode, Download, Copy, Plus, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase/browser';
import { useAuth } from '../auth/AuthProvider';

const QrBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrName, setQrName] = useState('');

  useEffect(() => {
    if (user) {
      loadQrCodes();
    }
  }, [user]);


  const loadQrCodes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/qr/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setQrCodes(result.qr_codes || []);
      }
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!user) return;
    
    if (!qrName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your QR code (e.g., 'Front Office', 'Back Office')",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/qr/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: qrName.trim() })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "QR code generated successfully!",
        });
        loadQrCodes(); // Reload the list
        setQrName(''); // Clear the name field
      } else {
        throw new Error(result.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const deleteQRCode = async (qrId) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/qr/delete/${qrId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "QR code deleted successfully",
        });
        loadQrCodes(); // Reload the list
      } else {
        throw new Error('Failed to delete QR code');
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast({
        title: "Error",
        description: "Failed to delete QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QR Code Builder</h2>
          <p className="text-gray-600">Generate QR codes for physical review collection</p>
        </div>
        <Button onClick={loadQrCodes} variant="outline">
          Refresh
        </Button>
      </div>

      {/* QR Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New QR Code</CardTitle>
          <CardDescription>
            Create QR codes that customers can scan to leave reviews directly from their phones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Your QR Codes</h3>
              <p className="text-sm text-gray-600">Generate QR codes for review collection</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={qrName}
                  onChange={(e) => setQrName(e.target.value)}
                  placeholder="Enter QR code name (e.g., Front Office, Back Office)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={generating}
                />
              </div>
              <Button 
                onClick={generateQRCode} 
                disabled={generating || !qrName.trim()} 
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {generating ? "Generating..." : "Generate QR Code"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading QR codes...</p>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">No QR codes generated yet</p>
              <p className="text-sm text-gray-500">Click "Generate QR Code" to create your first one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qrCodes.map((qr) => (
                <div key={qr.id} className="p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{qr.name || `QR Code #${qr.code}`}</p>
                        <p className="text-sm text-gray-600">
                          {qr.scans_count || 0} scans • Created {new Date(qr.created_at).toLocaleDateString()}
                          {qr.name && (
                            <span className="ml-2 text-blue-600">• {qr.code}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(qr.url, '_blank')}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(qr.url)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-4 h-4" />
                        Copy URL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(qr.download_url, '_blank')}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteQRCode(qr.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use QR Codes</CardTitle>
          <CardDescription>
            Instructions for setting up and using your QR codes for review collection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Generate QR Code</h4>
              <p className="text-sm text-gray-600">
                Click "Generate QR Code" to create a unique QR code for your business. 
                You can optionally assign it to a specific technician for tracking.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Download & Print</h4>
              <p className="text-sm text-gray-600">
                Download the QR code image and print it. Place it in visible locations 
                around your business like reception desks, service areas, or on business cards.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">3. Customer Experience</h4>
              <p className="text-sm text-gray-600">
                When customers scan the QR code with their phone camera, they'll be taken 
                directly to your review form where they can leave feedback.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">4. Track Results</h4>
              <p className="text-sm text-gray-600">
                Monitor scan counts and review submissions in your Collected Feedback tab. 
                Each QR code tracks its usage and attribution.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QrBuilder;
