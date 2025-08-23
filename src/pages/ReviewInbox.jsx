
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star, 
  MapPin, 
  Facebook, 
  MessageSquare, 
  Copy, 
  ExternalLink,
  Send,
  Filter,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';

const ReviewInbox = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({
    platform: 'all',
    sentiment: 'all'
  });
  const [aiReply, setAiReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user, filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Build query with filters
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('review_created_at', { ascending: false });

      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }

      if (filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReviews(data || []);
      
      // Select first review if none selected
      if (!selectedReview && data && data.length > 0) {
        setSelectedReview(data[0]);
      }
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const syncReviews = async () => {
    try {
      setSyncing(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      const response = await fetch('/api/reviews/sync/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: profile.business_id })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Sync completed! ${result.summary.total_inserted} new, ${result.summary.total_updated} updated`);
        fetchReviews();
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const generateAiReply = async () => {
    if (!selectedReview) return;

    try {
      setGeneratingReply(true);
      
      const response = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_text: selectedReview.text,
          rating: selectedReview.rating,
          platform: selectedReview.platform,
          business_context: 'Professional and friendly business response'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setAiReply(result.reply);
        setReplyText(result.reply);
      } else {
        toast.error('Failed to generate AI reply');
      }
      
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      // Update review with reply
      const { error } = await supabase
        .from('reviews')
        .update({
          reply_text: replyText,
          reply_posted_at: new Date().toISOString(),
          is_replied: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === selectedReview.id 
          ? { ...review, reply_text: replyText, reply_posted_at: new Date().toISOString(), is_replied: true }
          : review
      ));
      setSelectedReview(prev => ({ ...prev, reply_text: replyText, reply_posted_at: new Date().toISOString(), is_replied: true }));

      toast.success('Reply saved successfully');
      
      // Handle platform-specific actions
      handlePlatformReply(selectedReview.platform, replyText);
      
    } catch (error) {
      console.error('Error saving reply:', error);
      toast.error('Failed to save reply');
    }
  };

  const handlePlatformReply = (platform, replyText) => {
    switch (platform) {
      case 'google':
        // For Google Places (read-only), show copy and open options
        toast.success('Reply copied! Open Google Business to post manually.');
        navigator.clipboard.writeText(replyText);
        break;
      case 'facebook':
        // For Facebook, show copy and open options
        toast.success('Reply copied! Open Facebook Page to post manually.');
        navigator.clipboard.writeText(replyText);
        break;
      case 'yelp':
        // For Yelp (read-only), show copy and open options
        toast.success('Reply copied! Open Yelp to post manually.');
        navigator.clipboard.writeText(replyText);
        break;
      default:
        break;
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'google': return <MapPin className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'yelp': return <Star className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'google': return 'Google';
      case 'facebook': return 'Facebook';
      case 'yelp': return 'Yelp';
      default: return platform;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentLabel = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'Positive';
      case 'negative': return 'Negative';
      case 'neutral': return 'Neutral';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Review Inbox"
        subtitle="Manage and respond to customer reviews from all platforms."
      />

      {/* Filters and Sync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select
              value={filters.platform}
              onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="yelp">Yelp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={filters.sentiment}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sentiment: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={syncReviews} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync Reviews
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Left Panel - Review List */}
        <div className="lg:col-span-1 space-y-3 overflow-y-auto">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No reviews found</p>
                <p className="text-sm">Connect your platforms and sync to see reviews here</p>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card
                key={review.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedReview?.id === review.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedReview(review)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(review.platform)}
                      <span className="text-sm font-medium">
                        {getPlatformName(review.platform)}
                      </span>
                    </div>
                    <Badge variant="outline" className={getSentimentColor(review.sentiment)}>
                      {getSentimentLabel(review.sentiment)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-muted-foreground ml-2">
                      {review.rating}/5
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {review.text}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{review.reviewer_name}</span>
                    <span>{formatDate(review.review_created_at)}</span>
                  </div>
                  
                  {review.is_replied && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                      ✓ Replied
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right Panel - Review Details */}
        <div className="lg:col-span-2">
          {selectedReview ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(selectedReview.platform)}
                    <div>
                      <CardTitle className="text-lg">
                        {getPlatformName(selectedReview.platform)} Review
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        by {selectedReview.reviewer_name} • {formatDate(selectedReview.review_created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getSentimentColor(selectedReview.sentiment)}>
                      {getSentimentLabel(selectedReview.sentiment)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {renderStars(selectedReview.rating)}
                      <span className="text-sm font-medium ml-1">
                        {selectedReview.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Review Text */}
                <div>
                  <h4 className="font-medium mb-2">Review</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{selectedReview.text}</p>
                  </div>
                </div>

                {/* Review URL */}
                {selectedReview.review_url && (
                  <div>
                    <h4 className="font-medium mb-2">Review Link</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedReview.review_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on {getPlatformName(selectedReview.platform)}
                    </Button>
                  </div>
                )}

                {/* AI Reply Generation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">AI Reply Assistant</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateAiReply}
                      disabled={generatingReply}
                    >
                      {generatingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Generate Reply
                    </Button>
                  </div>
                  
                  {aiReply && (
                    <div className="p-4 bg-blue-50 rounded-lg mb-3">
                      <p className="text-sm text-blue-900">{aiReply}</p>
                    </div>
                  )}
                </div>

                {/* Reply Input */}
                <div>
                  <h4 className="font-medium mb-2">Your Reply</h4>
                  <Textarea
                    placeholder="Write your response to this review..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  
                  <div className="flex gap-2">
                    <Button onClick={handleReply} disabled={!replyText.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Save Reply
                    </Button>
                    
                    {aiReply && (
                      <Button
                        variant="outline"
                        onClick={() => setReplyText(aiReply)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Use AI Reply
                      </Button>
                    )}
                  </div>
                </div>

                {/* Existing Reply */}
                {selectedReview.is_replied && selectedReview.reply_text && (
                  <div>
                    <h4 className="font-medium mb-2">Your Response</h4>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-900">{selectedReview.reply_text}</p>
                      <p className="text-xs text-green-700 mt-2">
                        Posted on {formatDate(selectedReview.reply_posted_at)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Platform-specific Actions */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Actions</h4>
                  <div className="flex gap-2">
                    {selectedReview.platform === 'google' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(replyText || aiReply);
                          toast.success('Reply copied! Open Google Business to post manually.');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy & Open Google Business
                      </Button>
                    )}
                    
                    {selectedReview.platform === 'facebook' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(replyText || aiReply);
                          toast.success('Reply copied! Open Facebook Page to post manually.');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy & Open Facebook
                      </Button>
                    )}
                    
                    {selectedReview.platform === 'yelp' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(replyText || aiReply);
                          toast.success('Reply copied! Open Yelp to post manually.');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy & Open Yelp
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a review to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewInbox;


