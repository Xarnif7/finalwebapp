import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Send, Mail, CheckCircle, AlertCircle, Zap, Users } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCustomers } from '../../hooks/useCustomers';
import { useAuth } from '../auth/AuthProvider';

export const EmailTester = () => {
  const { user } = useAuth();
  const { customers, businessId } = useCustomers();
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from Blipp',
    message: 'This is a test email to verify the automation system is working correctly.'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');

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

  const handleTestAutomation = async () => {
    if (!selectedCustomer || !businessId) {
      setResult({ success: false, message: 'Please select a customer to test automation' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await apiClient.post('/api/test-automation', {
        customerId: selectedCustomer,
        businessId: businessId
      });
      setResult({ 
        success: true, 
        message: `Automation test completed! Processed ${response.sequencesProcessed} sequences for ${response.customer}`,
        details: response.results
      });
    } catch (error) {
      setResult({ 
        success: false, 
        message: error.message || 'Failed to test automation' 
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <Button 
            onClick={handleTestAutomation} 
            disabled={loading || !selectedCustomer}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Testing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Test Automation
              </div>
            )}
          </Button>
        </div>

        {/* Customer Selection for Automation Test */}
        {customers && customers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Customer for Automation Test</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} ({customer.email})
                </option>
              ))}
            </select>
          </div>
        )}

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
