import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

export default function PostCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const sessionId = searchParams.get('session_id');
  const maxRetries = 10; // Reduced from 30 to 10 for faster response

  console.log('[POSTCHECKOUT] Component mounted with sessionId:', sessionId);

  // Force refresh subscription status to avoid stale cache
  const { active: hasSubscription } = useSubscriptionStatus({ force: true });

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found');
      return;
    }

    // Set the flag to indicate user just paid
    sessionStorage.setItem('justPaid', '1');

    const verifyPayment = async () => {
      try {
        console.log('[POSTCHECKOUT] Verifying session:', sessionId);
        const data = await apiClient.get(`/api/stripe/verify?session_id=${sessionId}`);
        
        console.log('[POSTCHECKOUT] Verify response:', data);

        if (data.ok) {
          console.log('[POSTCHECKOUT] Payment verified, navigating to onboarding');
          // Instant redirect to onboarding
          navigate('/onboarding', { replace: true });
        } else if (data.reason === 'pending') {
          console.log('[POSTCHECKOUT] Payment still pending, will retry');
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000); // Reduced from 2000ms to 1000ms for faster retries
          } else {
            setError('Payment verification is taking longer than expected. Please try again.');
          }
        } else {
          throw new Error(data.error || 'Unknown verification error');
        }
      } catch (err) {
        console.error('[POSTCHECKOUT] Verification error:', err);
        setError(err.message);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, retryCount, maxRetries]);

  const handleRetry = () => {
    setStatus('verifying');
    setError(null);
    setRetryCount(0);
  };

  const handleBackToPaywall = () => {
    sessionStorage.removeItem('justPaid');
    navigate('/paywall', { replace: true });
  };

  // Prevent any other redirects from this page
  useEffect(() => {
    const blockRedirects = () => {
      console.log('[POSTCHECKOUT] Blocking redirects from post-checkout page');
    };
    return blockRedirects;
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToPaywall}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back to Paywall
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {retryCount > 0 ? 'Verifying Payment...' : 'Processing Payment'}
        </h2>
        <p className="text-gray-600">
          {retryCount > 0 
            ? `Attempt ${retryCount + 1} of ${maxRetries + 1}`
            : 'Please wait while we verify your payment.'
          }
        </p>
      </div>
    </div>
  );
}
