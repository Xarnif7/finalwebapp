import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Star, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';

export default function FeedbackCollection() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showPublicReview, setShowPublicReview] = useState(false);

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
      // Get review request data first
      const { data: reviewData, error: reviewError } = await supabase
        .from('review_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reviewError || !reviewData) {
        setError('Review request not found');
        setLoading(false);
        return;
      }

      // Get business data using the business_id
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', reviewData.business_id)
        .single();

      if (businessError || !businessData) {
        setError('Business information not found');
        setLoading(false);
        return;
      }

      setBusiness(businessData);
    } catch (err) {
      console.error('Error fetching business data:', err);
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

    setSubmitting(true);
    setError(null);

    try {
      // Store the private feedback using the API endpoint
      // No authentication needed for public feedback collection
      const response = await fetch('/api/private-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          review_request_id: requestId,
          sentiment: rating >= 4 ? 'positive' : rating >= 2 ? 'neutral' : 'negative',
          rating: rating,
          message: comment.trim() || null,
          category: 'general_experience'
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
    // Close if allowed; otherwise navigate away to a safe URL (business site or root)
    window.close();
    setTimeout(() => {
      const fallback = '/';
      try {
        window.location.href = fallback;
      } catch (_) {}
    }, 150);
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
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && !showPublicReview) {
    // Low rating (1-3 stars) - private feedback only
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Thank You!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thanks for your feedback! Our team will review this privately and work to improve your experience.
            </p>
            
            <Button 
              onClick={() => window.close()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Close
            </Button>

            <div className="text-xs text-gray-500">
              <p>Your feedback is confidential and will be used for internal improvement.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && showPublicReview) {
    // High rating (4-5 stars) - show public review option
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Thank You!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thanks for your feedback! Would you also share it publicly?
            </p>

            <div className="space-y-3">
              <Button 
                onClick={handlePublicReviewClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Leave a Public Review
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleMaybeLaterClick}
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              <p>Your private feedback has been received. Public reviews help other customers.</p>
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
          <CardTitle className="text-xl">How was your experience?</CardTitle>
          <p className="text-gray-600 text-sm">
            {business.name}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Star Rating */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {renderStars()}
              </div>
              <p className="text-sm text-gray-600">
                {rating === 0 ? 'Rate your experience' : 
                 rating === 1 ? 'Poor' :
                 rating === 2 ? 'Fair' :
                 rating === 3 ? 'Good' :
                 rating === 4 ? 'Great' : 'Excellent'}
              </p>
            </div>

            {/* Optional Comment */}
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Tell us more about your experience (optional)
              </label>
              <Textarea
                id="comment"
                placeholder="What made your experience great? Or how could we improve?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
              disabled={submitting || rating === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>Your feedback helps us improve our service.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
