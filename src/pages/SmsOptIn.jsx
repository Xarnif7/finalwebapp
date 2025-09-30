import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, MessageSquare, Shield, Clock, DollarSign, X, Info } from 'lucide-react';
import SmsOptInConsent from '../components/shared/SmsOptInConsent';

const SmsOptIn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    phone: searchParams.get('phone') || '',
    email: searchParams.get('email') || '',
    name: searchParams.get('name') || '',
    business: searchParams.get('business') || 'Blipp - Reputation Management Software'
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!smsConsent) {
      setError('SMS consent is required to receive messages');
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would typically send the opt-in data to your backend
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
    } catch (err) {
      setError('Failed to process opt-in request. Please try again.');
      console.error('SMS opt-in error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Opt-in Successful!</h2>
                <p className="text-gray-600 mt-2">
                  You have successfully opted in to receive SMS messages from {formData.business}.
                </p>
              </div>
              <div className="space-y-2 text-sm text-gray-500">
                <p><strong>Phone:</strong> {formData.phone}</p>
                <p><strong>Business:</strong> {formData.business}</p>
              </div>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">SMS Communications Opt-In</CardTitle>
          <p className="text-gray-600">
            Opt in to receive SMS messages from {formData.business}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the phone number where you want to receive SMS messages
                </p>
              </div>
            </div>

            {/* SMS Consent */}
            <SmsOptInConsent
              businessName={formData.business}
              onConsentChange={setSmsConsent}
              initialConsent={smsConsent}
              showFullForm={true}
            />

            {/* Error Display */}
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <X className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!smsConsent || isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isSubmitting ? 'Processing...' : 'Opt In to SMS Messages'}
            </Button>
          </form>

          {/* Additional Information */}
          <div className="pt-4 border-t border-gray-200">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <div className="space-y-2">
                  <p><strong>What happens next?</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>You'll receive a confirmation message at the phone number provided</li>
                    <li>You can opt out at any time by replying STOP to any message</li>
                    <li>Message frequency varies based on your service needs</li>
                    <li>Standard message and data rates may apply</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmsOptIn;
