import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Star, MessageSquare, CheckCircle, Heart, ExternalLink } from 'lucide-react';

export default function FeedbackForm() {
  const { businessId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPublicReview, setShowPublicReview] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (!businessId) {
      setError('Invalid business ID');
      setLoading(false);
      return;
    }

    fetchBusinessData();
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError || !businessData) {
        setError('Business not found');
        return;
      }

      setBusiness(businessData);
    } catch (err) {
      console.error('Error fetching business:', err);
      setError('Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingClick = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!customerEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit feedback to the QR feedback system
      const response = await fetch('/api/qr-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_id: businessId,
          sentiment: rating >= 4 ? 'positive' : rating >= 2 ? 'neutral' : 'negative',
          rating: rating,
          message: comment.trim() || null,
          category: 'general_experience',
          customer_name: customerName.trim() || null,
          customer_email: customerEmail.trim() || null,
          source: 'qr_code'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('Feedback submitted successfully:', result);

      setSubmitted(true);

      // If rating is 4-5 stars, show public review option
      if (rating >= 4) {
        setShowPublicReview(true);
      }

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublicReviewClick = () => {
    // Redirect to Google Reviews for the specific business
    if (business.google_place_id) {
      const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${business.google_place_id}`;
      window.open(googleReviewUrl, '_blank');
    } else if (business.google_review_url) {
      window.open(business.google_review_url, '_blank');
    } else {
      // Fallback to general Google search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(business.name + ' reviews')}`;
      window.open(searchUrl, '_blank');
    }
  };

  const handleMaybeLaterClick = () => {
    // Redirect to business website or close window
    console.log('🔍 Business data:', business);
    console.log('🔍 Business website:', business?.website);
    
    if (business?.website) {
      window.open(business.website, '_blank');
    } else {
      // Close the window/tab
      window.close();
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => handleRatingClick(i + 1)}
        className={`w-12 h-12 mx-1 transition-colors ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300 hover:text-yellow-200'
        }`}
      >
        <Star className="w-full h-full" />
      </button>
    ));
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
            <Button onClick={() => window.close()} variant="outline">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && !showPublicReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. {business.name} appreciates your input!
            </p>
            {business.website && (
              <Button 
                onClick={() => window.close()}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Close
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && showPublicReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Thanks for your feedback! Would you also share it publicly?
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handlePublicReviewClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Leave a Public Review
              </Button>
              <Button 
                onClick={handleMaybeLaterClick}
                variant="outline"
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Share Your Experience
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Help <span className="font-semibold text-gray-900">{business.name}</span> improve by sharing your feedback
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div className="text-center">
                <label className="block text-lg font-medium text-gray-700 mb-4">
                  How was your experience? *
                </label>
                <div className="flex justify-center space-x-2">
                  {renderStars()}
                </div>
                {rating > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Great"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us more about your experience
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like? What could be improved?"
                  rows={4}
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Customer Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Customer Email (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your email address *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
