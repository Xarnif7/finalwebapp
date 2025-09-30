import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, MessageSquare, Shield, Clock, DollarSign, X, Info, Phone } from 'lucide-react';

const SmsOptInFlow = ({ 
  customerPhone, 
  customerName, 
  businessName,
  onOptInComplete,
  onOptOut,
  className = ""
}) => {
  const [step, setStep] = useState('opt-in'); // 'opt-in', 'success', 'opted-out'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleOptIn = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Here you would call your backend to record the opt-in
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('success');
      onOptInComplete?.();
    } catch (err) {
      setError('Failed to process opt-in. Please try again.');
      console.error('SMS opt-in error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOptOut = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Here you would call your backend to record the opt-out
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('opted-out');
      onOptOut?.();
    } catch (err) {
      setError('Failed to process opt-out. Please try again.');
      console.error('SMS opt-out error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === 'success') {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Opt-in Successful!</h3>
              <p className="text-gray-600 text-sm">
                You'll now receive SMS messages from {businessName}.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <p><strong>Phone:</strong> {customerPhone}</p>
              <p><strong>Business:</strong> {businessName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'opted-out') {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Opt-out Complete</h3>
              <p className="text-gray-600 text-sm">
                You will no longer receive SMS messages from {businessName}.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <p>You can opt back in anytime by replying YES to a message.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-lg mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">SMS Communications Opt-In</CardTitle>
        <p className="text-gray-600 text-sm">
          {businessName} would like to send you SMS messages
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Contact Information Display */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="w-4 h-4 text-gray-500" />
            <span><strong>Phone:</strong> {customerPhone}</span>
          </div>
          <div className="text-sm text-gray-600">
            <strong>Business:</strong> {businessName}
          </div>
        </div>

        {/* SMS Consent Information */}
        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Data Protection:</strong> Your SMS opt-in data will not be shared with third parties.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Message Types:</strong> Service updates, appointment reminders, and review requests.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Frequency:</strong> Typically 1-4 messages per month, varies based on your service needs.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Costs:</strong> Standard message and data rates may apply per your carrier.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Opt-out:</strong> Reply STOP to any message to opt out anytime.
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Privacy Policy:</strong> For more information about how we handle your data, please review our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <X className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={handleOptIn}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {isProcessing ? 'Processing...' : 'Yes, Opt In'}
          </Button>
          <Button
            onClick={handleOptOut}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'No, Opt Out'}
          </Button>
        </div>

        {/* Additional Information */}
        <div className="pt-4 border-t border-gray-200">
          <Alert className="bg-gray-50 border-gray-200">
            <Info className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-gray-700 text-sm">
              <div className="space-y-1">
                <p><strong>What happens next?</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>If you opt in, you'll receive review requests and service updates</li>
                  <li>If you opt out, you won't receive any SMS messages</li>
                  <li>You can change your preference anytime by replying to a message</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmsOptInFlow;
