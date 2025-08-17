import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, MessageCircle, ExternalLink } from "lucide-react";
import { Business, Client, ReviewRequest, ReviewTracking } from "@/api/entities";
import { motion } from "framer-motion";

export default function ReviewLanding() {
  const location = useLocation();
  const [business, setBusiness] = useState(null);
  const [client, setClient] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReviewData();
  }, []);

  const loadReviewData = async () => {
    try {
      const params = new URLSearchParams(location.search);
      const requestId = params.get('request');
      const businessId = params.get('business');
      const clientId = params.get('client');

      if (!requestId || !businessId || !clientId) {
        setError("Invalid review link. Please contact the business for assistance.");
        return;
      }

      const [businessData, clientData, requestData] = await Promise.all([
        Business.get(businessId),
        Client.get(clientId),
        ReviewRequest.get(requestId)
      ]);

      setBusiness(businessData);
      setClient(clientData);
      setReviewRequest(requestData);

    } catch (error) {
      console.error("Error loading review data:", error);
      setError("Unable to load review information. Please try again later.");
    }
  };

  const handleStarClick = (starRating) => {
    setRating(starRating);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Save review tracking record
      await ReviewTracking.create({
        business_id: business.id,
        client_id: client.id,
        review_request_id: reviewRequest.id,
        platform: "google",
        rating: rating,
        review_text: reviewText,
        review_date: new Date().toISOString(),
        verified: false
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting review:", error);
      setError("Failed to save review information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectToGoogle = () => {
    if (business?.google_review_url) {
      window.open(business.google_review_url, '_blank');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-xl mb-4">âš ï¸</div>
            <p className="text-gray-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-md w-full shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ThumbsUp className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
              <p className="text-gray-600 mb-6">
                We've recorded your feedback. To help other customers find {business.name}, 
                please also leave your review on Google.
              </p>
              <Button 
                onClick={redirectToGoogle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Leave Review on Google
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full"
      >
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-16 mx-auto mb-4" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-gray-900">{business.name}</CardTitle>
            <p className="text-gray-600 mt-2">
              Hi {client.first_name}, how was your experience with us?
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Star Rating */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-3">Rate your experience:</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    className="transition-all duration-200 hover:scale-110"
                  >
                    <Star 
                      className={`w-10 h-10 ${star <= rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-400'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share your experience (optional):
                </label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us what made your experience great..."
                  className="h-24 resize-none"
                />
              </motion.div>
            )}

            {/* Submit Button */}
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </motion.div>
            )}

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


