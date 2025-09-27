import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/browser';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Star, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';

export default function FeedbackStandalone() {
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [formSettings, setFormSettings] = useState(null);
  
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

      // Load form settings for business
      try {
        const { data: settings } = await supabase
          .from('feedback_form_settings')
          .select('settings')
          .eq('business_id', reviewData.business_id)
          .maybeSingle();
        
        if (settings?.settings) {
          console.log('Form settings loaded:', settings.settings);
          setFormSettings(settings.settings);
        } else {
          console.log('No form settings found for business_id:', reviewData.business_id);
        }
      } catch (e) {
        console.log('No form settings found, using defaults');
      }

      // Try to get business info from review_sources first (Google connection)
      let businessInfo = null;
      try {
        console.log('Looking for review_sources with business_id:', reviewData.business_id);
        const { data: sourceData, error: sourceError } = await supabase
          .from('review_sources')
          .select('business_name, public_url, external_id')
          .eq('business_id', reviewData.business_id)
          .eq('platform', 'google')
          .maybeSingle();
        
        console.log('Review source query result:', { sourceData, sourceError });
        
        if (sourceData) {
          businessInfo = {
            name: sourceData.business_name,
            website: sourceData.public_url,
            google_place_id: sourceData.external_id
          };
          console.log('Using review source data:', businessInfo);
        }
      } catch (e) {
        console.log('Error fetching review source data:', e);
      }

      // Fallback to businesses table
      if (!businessInfo) {
        try {
          console.log('Looking for business data with business_id:', reviewData.business_id);
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('name, website, google_review_url')
            .eq('id', reviewData.business_id)
            .maybeSingle();
          
          console.log('Business data query result:', { businessData, businessError });
          
          if (businessData) {
            businessInfo = businessData;
            console.log('Using business table data:', businessInfo);
          } else {
            console.log('No business data found, businessError:', businessError);
          }
        } catch (e) {
          console.log('Error fetching business data:', e);
        }
      }

      // Use fallback if no business info found
      if (!businessInfo) {
        businessInfo = {
          name: 'Our Business',
          website: null,
          google_place_id: null
        };
      }

      console.log('Final business info loaded:', businessInfo);
      console.log('Business info details:', {
        name: businessInfo.name,
        website: businessInfo.website,
        google_review_url: businessInfo.google_review_url
      });
      setBusiness(businessInfo);
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
    if (rating === 0) return;

    setSubmitting(true);
    try {
      // Determine sentiment using AI analysis if there's a message, otherwise use rating
      let sentiment = rating <= 3 ? 'negative' : rating === 4 ? 'neutral' : 'positive';
      
      // If there's a message, use AI to analyze sentiment
      if (comment && comment.trim()) {
        try {
          console.log('🤖 Calling AI sentiment analysis API...', { text: comment, rating });
          const aiResponse = await fetch('/api/ai/analyze-sentiment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: comment,
              rating: rating
            })
          });
          
          console.log('🤖 AI API response status:', aiResponse.status);
          
          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            console.log('🤖 AI API result:', aiResult);
            if (aiResult.sentiment) {
              sentiment = aiResult.sentiment;
              console.log('✅ AI sentiment analysis successful:', { text: comment, rating, aiSentiment: sentiment });
            }
          } else {
            const errorText = await aiResponse.text();
            console.error('❌ AI sentiment analysis API error:', aiResponse.status, errorText);
            
            // Smart fallback: analyze text for negative keywords
            const negativeKeywords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed', 'hate', 'angry', 'frustrated', 'poor', 'unacceptable', 'sucks', 'garbage', 'trash', 'waste', 'regret', 'never again', 'awful service', 'bad service', 'terrible job', 'did a terrible job'];
            const text = comment.toLowerCase();
            const hasNegativeKeywords = negativeKeywords.some(keyword => text.includes(keyword));
            
            if (hasNegativeKeywords) {
              sentiment = 'negative';
              console.log('🧠 Smart fallback detected negative sentiment from keywords:', { text: comment, sentiment });
            } else {
              console.log('🧠 Smart fallback using rating-based sentiment:', { text: comment, rating, sentiment });
            }
          }
        } catch (aiError) {
          console.error('❌ AI sentiment analysis failed, using smart fallback:', aiError);
          
          // Smart fallback: analyze text for negative keywords
          const negativeKeywords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed', 'hate', 'angry', 'frustrated', 'poor', 'unacceptable', 'sucks', 'garbage', 'trash', 'waste', 'regret', 'never again', 'awful service', 'bad service', 'terrible job', 'did a terrible job'];
          const text = comment.toLowerCase();
          const hasNegativeKeywords = negativeKeywords.some(keyword => text.includes(keyword));
          
          if (hasNegativeKeywords) {
            sentiment = 'negative';
            console.log('🧠 Smart fallback detected negative sentiment from keywords:', { text: comment, sentiment });
          } else {
            console.log('🧠 Smart fallback using rating-based sentiment:', { text: comment, rating, sentiment });
          }
        }
      }

      const response = await fetch('/api/private-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_request_id: requestId,
          rating: rating,
          message: comment,
          sentiment: sentiment
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit feedback');

      setSubmitted(true);
      
      // Show public review option for 4-5 star ratings
      if (rating >= 4) {
        setShowPublicReview(true);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaybeLaterClick = () => {
    console.log('Maybe Later clicked, business data:', business);
    if (business?.website) {
      // Ensure the website URL has a protocol
      let websiteUrl = business.website;
      if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = 'https://' + websiteUrl;
      }
      console.log('Opening website:', websiteUrl);
      window.open(websiteUrl, '_blank');
    } else {
      console.log('No website found, closing window');
      window.close();
    }
  };

  const handlePublicReviewClick = () => {
    console.log('Google review clicked, business data:', business);
    if (business?.google_review_url) {
      // Use the direct Google review URL from settings
      console.log('Opening Google review URL from settings:', business.google_review_url);
      window.open(business.google_review_url, '_blank');
    } else if (business?.website) {
      console.log('No Google review URL, opening website:', business.website);
      window.open(business.website, '_blank');
    } else {
      console.log('No Google review URL or website, closing window');
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Feedback Not Available</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const settings = formSettings || {};
    const successMessage = rating <= 3 
      ? (settings.negative_success_message || 'Thanks for your feedback! Our team will review this privately and work to improve your experience.')
      : (settings.positive_success_message || 'Thanks for your feedback! Would you also share it publicly?');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            
            {rating <= 3 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="font-medium text-blue-800">Private Feedback Received</p>
                    <p className="text-sm text-blue-700">We appreciate your honesty and will use this to make our service better.</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-6">
              Your feedback is confidential and will be used for internal improvement.
            </p>

            {showPublicReview ? (
              <div className="space-y-3">
                <Button onClick={handlePublicReviewClick} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Leave a Google Review
                </Button>
                <Button onClick={handleMaybeLaterClick} variant="outline" className="w-full">
                  Maybe Later
                </Button>
              </div>
            ) : (
              <Button onClick={handleMaybeLaterClick} className="w-full">
                Close
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const settings = formSettings || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {settings.form_title || 'How was your experience?'}
          </CardTitle>
          {settings.form_subtitle && (
            <p className="text-gray-600 mt-2">{settings.form_subtitle}</p>
          )}
          {business?.name && (
            <p className="text-sm text-gray-500 mt-1">with {business.name}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRatingClick(i + 1)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-12 h-12 mx-1 transition-colors ${
                        i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {settings.show_rating_labels && (
                <p className="text-sm text-gray-600">
                  {rating === 0 && 'Rate your experience'}
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            {/* Comment Field */}
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                Tell us more about your experience (optional)
              </label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={settings.comment_placeholder || 'What made your experience great? Or how could we improve?'}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={rating === 0 || submitting}
              className="w-full"
            >
              {submitting ? 'Submitting...' : (settings.submit_button_text || 'Submit Feedback')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
