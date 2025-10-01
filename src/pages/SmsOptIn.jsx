import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

/**
 * Sanitize brand name for display
 * - Strip HTML
 * - Trim whitespace
 * - Limit to 80 chars
 * - Allow letters, numbers, spaces, & basic punctuation
 * - Fallback to "Blipp" if empty/invalid
 */
function sanitizeBrand(input) {
  if (!input || typeof input !== 'string') return 'Blipp';
  
  // Strip HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Allow only letters, numbers, spaces, and basic punctuation (. , - ' &)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s.,\-'&]/g, '');
  
  // Limit to 80 characters
  sanitized = sanitized.substring(0, 80);
  
  // If empty after sanitization, return default
  return sanitized || 'Blipp';
}

export default function SmsOptIn() {
  const [searchParams] = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Get brand from query params, default to "Blipp"
  const brand = sanitizeBrand(searchParams.get('business'));

  // Pre-fill form if provided in query params
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    
    if (phoneParam) setPhoneNumber(phoneParam);
    if (emailParam) setEmail(emailParam);
    if (nameParam) setName(nameParam);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      // TODO: Add API call to save opt-in
      // const response = await fetch('/api/sms-opt-in', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber, email, name, brand }),
      // });

      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit opt-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-green-600">Success!</CardTitle>
            <CardDescription className="text-center">
              You've successfully opted in to receive SMS from {brand}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              You'll start receiving text messages at {phoneNumber}.
            </p>
            <p className="text-sm text-gray-600">
              Reply <strong>STOP</strong> at any time to opt out.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">SMS Opt-In for {brand}</CardTitle>
          <CardDescription>
            Enter your phone number to receive SMS from {brand} about your account and service updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (Optional)
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-gray-700">
              <p>
                By providing your phone number, you agree to receive SMS from <strong>{brand}</strong>. 
                Message & data rates may apply. Message frequency varies. Reply <strong>STOP</strong> to 
                opt out, <strong>HELP</strong> for help. See our{' '}
                <a href="https://myblipp.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="https://myblipp.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Privacy
                </a>.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Opt In to SMS'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}