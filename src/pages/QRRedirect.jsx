import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Star, MessageSquare, ExternalLink, Smartphone } from 'lucide-react';

export default function QRRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [tech, setTech] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setError('Invalid QR code');
      setLoading(false);
      return;
    }

    fetchQRData();
  }, [code]);

  const fetchQRData = async () => {
    try {
      // Get QR code data
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select(`
          *,
          businesses!inner(id, name, industry, city, google_place_id),
          techs(id, name, role)
        `)
        .eq('code', code)
        .single();

      if (qrError || !qrData) {
        setError('QR code not found');
        setLoading(false);
        return;
      }

      setBusiness(qrData.businesses);
      setTech(qrData.techs);

      // Increment scan count
      await supabase
        .from('qr_codes')
        .update({
          scans_count: qrData.scans_count + 1,
          last_scanned_at: new Date().toISOString()
        })
        .eq('id', qrData.id);

      // Log telemetry event
      await supabase.rpc('log_telemetry_event', {
        p_business_id: qrData.business_id,
        p_event_type: 'qr_code_scanned',
        p_event_data: {
          qr_code_id: qrData.id,
          tech_id: qrData.tech_id,
          code: code
        }
      });

    } catch (err) {
      console.error('Error fetching QR data:', err);
      setError('Failed to load QR code data');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleReview = () => {
    if (business?.google_place_id) {
      // Open Google review page
      window.open(`https://search.google.com/local/writereview?placeid=${business.google_place_id}`, '_blank');
    } else {
      // Fallback to Google search
      window.open(`https://www.google.com/search?q=${encodeURIComponent(business.name + ' ' + business.city)}`, '_blank');
    }

    // Log click event
    if (business) {
      supabase.rpc('log_telemetry_event', {
        p_business_id: business.id,
        p_event_type: 'review_link_clicked',
        p_event_data: {
          qr_code: code,
          tech_id: tech?.id,
          action: 'google_review'
        }
      });
    }
  };

  const handlePrivateFeedback = () => {
    navigate(`/feedback/${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">QR Code Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This QR code is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {business.name.charAt(0)}
            </span>
          </div>
          <CardTitle className="text-2xl">{business.name}</CardTitle>
          <p className="text-gray-600">
            {business.industry} • {business.city}
          </p>
          {tech && (
            <p className="text-sm text-blue-600 mt-2">
              Served by: {tech.name}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">How was your experience?</h3>
            <p className="text-gray-600 text-sm">
              We'd love to hear about your visit!
            </p>
          </div>

          {/* Google Review Button */}
          <Button 
            onClick={handleGoogleReview}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Star className="w-5 h-5 mr-2" />
            Leave a Google Review
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          {/* Private Feedback Button */}
          <Button 
            onClick={handlePrivateFeedback}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Send Private Feedback
          </Button>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Your feedback helps us improve our service</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
