import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SmsOptInFlow from '../components/shared/SmsOptInFlow';
import { supabase } from '../lib/supabase/browser';

const SmsOptInRequest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const phone = searchParams.get('phone');
        const businessId = searchParams.get('business_id');
        const customerId = searchParams.get('customer_id');

        if (!phone || !businessId) {
          setError('Missing required parameters. Please check the link.');
          setLoading(false);
          return;
        }

        // Fetch customer data
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select(`
            id,
            full_name,
            phone,
            email,
            sms_consent,
            opted_out,
            businesses!inner(
              id,
              name
            )
          `)
          .eq('business_id', businessId)
          .eq('phone', phone.replace(/\D/g, ''))
          .single();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
          setError('Customer not found. Please check the link.');
          setLoading(false);
          return;
        }

        setCustomerData(customer);
        setLoading(false);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Failed to load customer data. Please try again.');
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [searchParams]);

  const handleOptInComplete = async () => {
    try {
      const response = await fetch('/api/sms/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: customerData.phone,
          business_id: customerData.businesses.id,
          customer_id: customerData.id,
          action: 'opt-in'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process opt-in');
      }

      // Update local state
      setCustomerData(prev => ({
        ...prev,
        sms_consent: true,
        opted_out: false
      }));
    } catch (error) {
      console.error('Error processing opt-in:', error);
      setError('Failed to process opt-in. Please try again.');
    }
  };

  const handleOptOut = async () => {
    try {
      const response = await fetch('/api/sms/opt-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: customerData.phone,
          business_id: customerData.businesses.id,
          customer_id: customerData.id,
          action: 'opt-out'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process opt-out');
      }

      // Update local state
      setCustomerData(prev => ({
        ...prev,
        sms_consent: false,
        opted_out: true
      }));
    } catch (error) {
      console.error('Error processing opt-out:', error);
      setError('Failed to process opt-out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Customer Not Found</h2>
            <p className="text-yellow-600 mb-4">We couldn't find your customer information.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SmsOptInFlow
        customerPhone={customerData.phone}
        customerName={customerData.full_name}
        businessName={customerData.businesses.name}
        onOptInComplete={handleOptInComplete}
        onOptOut={handleOptOut}
      />
    </div>
  );
};

export default SmsOptInRequest;
