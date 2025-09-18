import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle, MessageSquare, Clock, Phone } from 'lucide-react';

export default function PrivateFeedback() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState(null);
  const [tech, setTech] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    sentiment: '',
    category: '',
    message: '',
    preferredCallbackTime: '',
    phoneNumber: ''
  });

  const categories = [
    { value: 'service_quality', label: 'Service Quality' },
    { value: 'communication', label: 'Communication' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'timeliness', label: 'Timeliness' },
    { value: 'cleanliness', label: 'Cleanliness' },
    { value: 'staff_behavior', label: 'Staff Behavior' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'other', label: 'Other' }
  ];

  const callbackTimes = [
    { value: 'morning', label: 'Morning (9am-12pm)' },
    { value: 'afternoon', label: 'Afternoon (12pm-5pm)' },
    { value: 'evening', label: 'Evening (5pm-8pm)' },
    { value: 'anytime', label: 'Anytime' }
  ];

  useEffect(() => {
    if (!requestId) {
      setError('Invalid feedback request');
      setLoading(false);
      return;
    }

    fetchBusinessData();
  }, [requestId]);

  const fetchBusinessData = async () => {
    try {
      // Try to get business data from QR code first
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select(`
          *,
          businesses!inner(id, name, industry, city, phone, email),
          techs(id, name, role)
        `)
        .eq('code', requestId)
        .single();

      if (qrData && !qrError) {
        setBusiness(qrData.businesses);
        setTech(qrData.techs);
      } else {
        // Fallback: try to get from review request
        const { data: reviewData, error: reviewError } = await supabase
          .from('review_requests')
          .select(`
            *,
            businesses!inner(id, name, industry, city, phone, email),
            techs(id, name, role)
          `)
          .eq('id', requestId)
          .single();

        if (reviewData && !reviewError) {
          setBusiness(reviewData.businesses);
          setTech(reviewData.techs);
        } else {
          setError('Business information not found');
        }
      }
    } catch (err) {
      console.error('Error fetching business data:', err);
      setError('Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.sentiment || !formData.category || !formData.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create private feedback record
      const { data: feedback, error: feedbackError } = await supabase
        .from('private_feedback')
        .insert({
          review_request_id: requestId,
          sentiment: formData.sentiment,
          category: formData.category,
          message: formData.message
        })
        .select()
        .single();

      if (feedbackError) {
        throw feedbackError;
      }

      // Log telemetry event
      await supabase.rpc('log_telemetry_event', {
        p_business_id: business.id,
        p_event_type: 'private_feedback_submitted',
        p_event_data: {
          feedback_id: feedback.id,
          sentiment: formData.sentiment,
          category: formData.category,
          has_callback_request: !!formData.preferredCallbackTime
        }
      });

      setSubmitted(true);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
            <CardTitle className="text-red-600">Feedback Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {error || 'Unable to load feedback form.'}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Feedback Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for your feedback! We appreciate you taking the time to share your experience.
            </p>
            
            {formData.preferredCallbackTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">We'll Call You Soon</span>
                </div>
                <p className="text-sm text-blue-700">
                  We'll reach out to you during your preferred time: {callbackTimes.find(t => t.value === formData.preferredCallbackTime)?.label}
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>Your feedback helps us improve our service.</p>
            </div>
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
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">Private Feedback</CardTitle>
          <p className="text-gray-600 text-sm">
            {business.name} • {business.industry}
          </p>
          {tech && (
            <p className="text-xs text-blue-600 mt-1">
              Served by: {tech.name}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Sentiment */}
            <div>
              <Label htmlFor="sentiment">How was your experience? *</Label>
              <Select 
                value={formData.sentiment} 
                onValueChange={(value) => handleInputChange('sentiment', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">😊 Positive</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="negative">😞 Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">What was this about? *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message">Tell us more *</Label>
              <Textarea
                id="message"
                placeholder="Please share your feedback..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Callback Time */}
            <div>
              <Label htmlFor="callbackTime">Preferred callback time (optional)</Label>
              <Select 
                value={formData.preferredCallbackTime} 
                onValueChange={(value) => handleInputChange('preferredCallbackTime', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="When would you like us to call?" />
                </SelectTrigger>
                <SelectContent>
                  {callbackTimes.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number (if callback requested) */}
            {formData.preferredCallbackTime && (
              <div>
                <Label htmlFor="phoneNumber">Phone number for callback</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Your feedback is private and will be reviewed by our team.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
