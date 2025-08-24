
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Minus
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
    sentiment: 'all',
    search: ''
  });
  const [aiReply, setAiReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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

      // Build query
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('review_created_at', { ascending: false });

      // Apply filters
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }

      if (filters.search) {
        query = query.or(`reviewer_name.ilike.%${filters.search}%,text.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
      
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
        fetchReviews(); // Refresh reviews after sync
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error('Failed to sync reviews');
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (filter, value) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };

  const handleSelectReview = (review) => {
    setSelectedReview(review);
    setReplyText('');
    setAiReply('');
  };

  const generateAiReply = async () => {
    if (!selectedReview) return;

    try {
      setGeneratingReply(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      const response = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_text: selectedReview.text,
          rating: selectedReview.rating,
          platform: selectedReview.platform,
          business_context: `Business ID: ${profile.business_id}`
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setAiReply(result.reply);
        setReplyText(result.reply);
      } else {
        toast.error(`AI reply generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      setSendingReply(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      // Handle different platforms
      if (selectedReview.platform === 'facebook') {
        // Try to post reply via Facebook API
        const response = await fetch('/api/reviews/reply/facebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: profile.business_id,
            review_id: selectedReview.id,
            reply_text: replyText
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          toast.success('Reply posted successfully!');
          // Update local state
          setSelectedReview(prev => ({
            ...prev,
            is_replied: true,
            reply_text: replyText,
            reply_posted_at: new Date().toISOString()
          }));
          fetchReviews(); // Refresh to get updated data
        } else if (result.code === 'PERMISSION_DENIED') {
          // Show copy & open options
          toast.info('Reply not permitted - use Copy & Open Facebook');
        } else {
          toast.error(`Reply failed: ${result.error}`);
        }
      } else {
        // For Google and Yelp, just copy to clipboard
        await navigator.clipboard.writeText(replyText);
        toast.success('Reply copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const copyReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      await navigator.clipboard.writeText(replyText);
      toast.success('Reply copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy reply');
    }
  };

  const openPlatform = () => {
    if (!selectedReview) return;
    
    let url = '';
    switch (selectedReview.platform) {
      case 'google':
        url = selectedReview.review_url || 'https://maps.google.com';
        break;
      case 'facebook':
        url = selectedReview.review_url || 'https://facebook.com';
        break;
      case 'yelp':
        url = selectedReview.review_url || 'https://yelp.com';
        break;
      default:
        return;
    }
    
    window.open(url, '_blank');
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'google': return <MapPin className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'yelp': return <Star className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="default" className="bg-green-100 text-green-800"><ThumbsUp className="h-3 w-3 mr-1" />Positive</Badge>;
      case 'negative':
        return <Badge variant="destructive"><ThumbsDown className="h-3 w-3 mr-1" />Negative</Badge>;
      case 'neutral':
        return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />Neutral</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      );
    }
    return stars;
  };

  const getReplyButton = () => {
    if (!selectedReview) return null;

    if (selectedReview.platform === 'facebook') {
      return (
        <Button
          onClick={handleSendReply}
          disabled={!replyText.trim() || sendingReply}
          className="w-full"
        >
          {sendingReply ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Reply
        </Button>
      );
    } else {
      return (
        <div className="flex gap-2">
          <Button
            onClick={copyReply}
            disabled={!replyText.trim()}
            variant="outline"
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Reply
          </Button>
          <Button
            onClick={openPlatform}
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open {selectedReview.platform === 'google' ? 'Google' : 'Yelp'}
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Review Inbox"
        subtitle="Manage and respond to all your customer reviews in one place."
      />

      {/* Filters and Sync */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search reviews..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.platform}
            onValueChange={(value) => handleFilterChange('platform', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="yelp">Yelp</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sentiment}
            onValueChange={(value) => handleFilterChange('sentiment', value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={syncReviews}
          disabled={syncing}
          variant="outline"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync Reviews
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviews List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Reviews ({reviews.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <div className="text-lg font-medium mb-2">No reviews found</div>
                  <div className="text-sm">Connect your review platforms and sync to get started.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      onClick={() => handleSelectReview(review)}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedReview?.id === review.id ? 'bg-muted border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(review.platform)}
                          <span className="font-medium text-sm">{review.reviewer_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getRatingStars(review.rating)}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {review.text}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSentimentBadge(review.sentiment)}
                          {review.is_replied && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Replied
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.review_created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Review Detail */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Review Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReview ? (
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(selectedReview.platform)}
                        <span className="font-medium">{selectedReview.reviewer_name}</span>
                        <Badge variant="outline">{selectedReview.platform}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {getRatingStars(selectedReview.rating)}
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(selectedReview.review_created_at).toLocaleString()}
                        </span>
                      </div>
                      {getSentimentBadge(selectedReview.sentiment)}
                    </div>
                    
                    {selectedReview.review_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedReview.review_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Original
                      </Button>
                    )}
                  </div>

                  {/* Review Text */}
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{selectedReview.text}</p>
                  </div>

                  {/* Existing Reply */}
                  {selectedReview.is_replied && selectedReview.reply_text && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800 mb-2">Your Reply:</div>
                      <p className="text-sm text-green-700">{selectedReview.reply_text}</p>
                      <div className="text-xs text-green-600 mt-2">
                        Posted: {new Date(selectedReview.reply_posted_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* AI Reply Generation */}
                  {!selectedReview.is_replied && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">AI Reply Assistant</h4>
                        <Button
                          onClick={generateAiReply}
                          disabled={generatingReply}
                          variant="outline"
                          size="sm"
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
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="font-medium text-blue-800 mb-2">AI Generated Reply:</div>
                          <p className="text-sm text-blue-700">{aiReply}</p>
                        </div>
                      )}

                      {/* Reply Input */}
                      <div className="space-y-2">
                        <Label htmlFor="reply-text">Your Reply</Label>
                        <Textarea
                          id="reply-text"
                          placeholder="Write your reply here..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={4}
                        />
                      </div>

                      {/* Reply Actions */}
                      {getReplyButton()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <div className="text-lg font-medium mb-2">Select a review</div>
                  <div className="text-sm">Choose a review from the list to view details and respond.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReviewInbox;


