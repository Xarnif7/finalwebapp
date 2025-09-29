import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Star, 
  ExternalLink, 
  MessageSquare, 
  Copy, 
  CheckCircle, 
  Clock, 
  Filter,
  Plus,
  Bot,
  Search,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "../lib/supabase/browser";

const platformConfig = {
  google: { 
    name: 'Google', 
    color: 'bg-blue-100 text-blue-800', 
    icon: '🔍',
    responseUrl: 'https://www.google.com/maps'
  },
  facebook: { 
    name: 'Facebook', 
    color: 'bg-blue-100 text-blue-600', 
    icon: '📘',
    responseUrl: 'https://www.facebook.com'
  },
  yelp: { 
    name: 'Yelp', 
    color: 'bg-red-100 text-red-800', 
    icon: '🔴',
    responseUrl: 'https://www.yelp.com'
  },
  bbb: { 
    name: 'Better Business Bureau', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: '🏆',
    responseUrl: 'https://www.bbb.org'
  }
};

const statusConfig = {
  unread: { color: "bg-red-100 text-red-800", label: "Unread" },
  responded: { color: "bg-green-100 text-green-800", label: "Responded" },
  needs_followup: { color: "bg-yellow-100 text-yellow-800", label: "Needs Follow-up" },
  ignored: { color: "bg-gray-100 text-gray-800", label: "Ignored" }
};

export default function ReviewsInbox() {
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [aiResponse, setAiResponse] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customResponse, setCustomResponse] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('created_by', user.id)
        .limit(1);

      if (!error && businesses && businesses.length > 0) {
        const currentBusiness = businesses[0];
        setBusiness(currentBusiness);

        // Fetch reviews
        const response = await fetch(`/api/reviews?business_id=${currentBusiness.id}`);
        
        // Check if response is ok and content-type is JSON
        if (!response.ok) {
          console.error('❌ Reviews API error:', response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Reviews API returned non-JSON response:', text.substring(0, 200));
          throw new Error('API returned non-JSON response');
        }
        
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = !searchTerm || 
      review.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.review_text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = filterPlatform === "all" || review.platform === filterPlatform;
    const matchesRating = filterRating === "all" || review.rating === parseInt(filterRating);
    const matchesStatus = filterStatus === "all" || review.response_status === filterStatus;
    
    return matchesSearch && matchesPlatform && matchesRating && matchesStatus;
  });

  const generateAIResponse = async () => {
    if (!selectedReview) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_text: selectedReview.review_text,
          rating: selectedReview.rating,
          platform: selectedReview.platform,
          business_name: business?.name || 'Your Business'
        })
      });
      
      const data = await response.json();
      setAiResponse(data.response);
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const updateReviewStatus = async (reviewId, status) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_status: status })
      });
      
      if (response.ok) {
        // Update local state
        setReviews(reviews.map(review => 
          review.id === reviewId 
            ? { ...review, response_status: status }
            : review
        ));
        
        // Update selected review if it's the same one
        if (selectedReview && selectedReview.id === reviewId) {
          setSelectedReview({ ...selectedReview, response_status: status });
        }
      }
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const getPlatformUrl = (review) => {
    const platform = platformConfig[review.platform];
    return platform?.responseUrl || '#';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex">
      {/* Left Sidebar - Reviews List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Reviews Inbox</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Platforms</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="yelp">Yelp</option>
              <option value="bbb">BBB</option>
            </select>
            
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="responded">Responded</option>
              <option value="needs_followup">Needs Follow-up</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto">
          {filteredReviews.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No reviews found</p>
              <p className="text-sm mt-2">Reviews will appear here once imported</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredReviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedReview?.id === review.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {review.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.customer_name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {platformConfig[review.platform]?.icon} {platformConfig[review.platform]?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge className={`${statusConfig[review.response_status].color} text-xs`}>
                      {statusConfig[review.response_status].label}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {review.review_text}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{format(new Date(review.review_date), 'MMM d, h:mm a')}</span>
                    {review.response_status === 'unread' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Selected Review */}
      <div className="flex-1 flex flex-col">
        {selectedReview ? (
          <>
            {/* Review Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium">
                    {selectedReview.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedReview.customer_name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < selectedReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge className={platformConfig[selectedReview.platform].color}>
                        {platformConfig[selectedReview.platform].icon} {platformConfig[selectedReview.platform].name}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {format(new Date(selectedReview.review_date), 'MMMM d, yyyy \'at\' h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getPlatformUrl(selectedReview), '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Respond to Review
                  </Button>
                  
                  <select
                    value={selectedReview.response_status}
                    onChange={(e) => updateReviewStatus(selectedReview.id, e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="unread">Unread</option>
                    <option value="responded">Responded</option>
                    <option value="needs_followup">Needs Follow-up</option>
                    <option value="ignored">Ignored</option>
                  </select>
                </div>
              </div>
              
              {/* Review Text */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed">{selectedReview.review_text}</p>
              </div>
            </div>

            {/* AI Response Generator */}
            <div className="flex-1 p-6 bg-white">
              <div className="max-w-4xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  AI Response Generator
                </h3>
                
                <div className="space-y-4">
                  <Button
                    onClick={generateAIResponse}
                    disabled={isGeneratingAI}
                    className="gap-2"
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        Generate AI Response
                      </>
                    )}
                  </Button>

                  {aiResponse && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-blue-900">AI Generated Response:</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(aiResponse)}
                          className="gap-2"
                        >
                          {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <p className="text-blue-800 leading-relaxed">{aiResponse}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Response (Optional)
                    </label>
                    <Textarea
                      value={customResponse}
                      onChange={(e) => setCustomResponse(e.target.value)}
                      placeholder="Write your own response or edit the AI response..."
                      rows={4}
                      className="mb-3"
                    />
                    {customResponse && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(customResponse)}
                        className="gap-2"
                      >
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Custom Response'}
                      </Button>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Next Steps:</h4>
                    <ol className="text-sm text-yellow-800 space-y-1">
                      <li>1. Copy the response above</li>
                      <li>2. Click "Respond to Review" to open the platform</li>
                      <li>3. Paste your response and submit</li>
                      <li>4. Mark as "Responded" when done</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Review</h3>
              <p className="text-gray-500">Choose a review from the list to view details and generate responses</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
