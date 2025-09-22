import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const EmailTester = () => {
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from Blipp',
    message: 'This is a test email to verify the automation system is working correctly.'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSendTest = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      setResult({ success: false, message: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await apiClient.post('/api/test-email', formData);
      setResult({ 
        success: true, 
        message: 'Test email sent successfully!',
        emailId: response.emailId 
      });
    } catch (error) {
      setResult({ 
        success: false, 
        message: error.message || 'Failed to send test email' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Testing Tool
        </CardTitle>
        <CardDescription>
          Send a test email to verify the automation system is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">To Email Address</label>
          <Input
            type="email"
            placeholder="your-email@example.com"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input
            placeholder="Test Email Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            placeholder="Enter your test message here..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
          />
        </div>

        <Button 
          onClick={handleSendTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Test Email
            </div>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {result.success ? 'Success!' : 'Error'}
              </span>
            </div>
            <p className="mt-1 text-sm">{result.message}</p>
            {result.emailId && (
              <p className="mt-1 text-xs opacity-75">
                Email ID: {result.emailId}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
