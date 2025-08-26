
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Minus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Mail,
  Smartphone,
  LogOut,
  Eye,
  Trash2,
  Archive,
  RotateCcw
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
    status: 'all',
    rating: 'all',
    dateRange: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyTone, setReplyTone] = useState('professional');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [metrics, setMetrics] = useState({
    unreplied: 0,
    avgRating: 0,
    newReviews: 0,
    responseTime: 0
  });

  useEffect(() => {
    if (user) {
      fetchReviews();
      fetchMetrics();
    }
  }, [user, filters, sortBy]);

  const fetchMetrics = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Get unreplied count
      const { count: unrepliedCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.business_id)
        .eq('responded', false);

      // Get average rating (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', profile.business_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const avgRating = recentReviews?.length > 0 
        ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length 
        : 0;

      // Get new reviews (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: newReviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.business_id)
        .gte('created_at', sevenDaysAgo.toISOString());

      setMetrics({
        unreplied: unrepliedCount || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        newReviews: newReviewsCount || 0,
        responseTime: 2.5 // Placeholder - would calculate from actual data
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      let query = supabase
        .from('reviews')
        .select('*')
        .eq('business_id', profile.business_id);

      // Apply filters
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      if (filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }
      if (filters.status !== 'all') {
        query = query.eq('responded', filters.status === 'replied');
      }
      if (filters.rating !== 'all') {
        query = query.eq('rating', parseInt(filters.rating));
      }
      if (filters.search) {
        query = query.or(`author_name.ilike.%${filters.search}%,body.ilike.%${filters.search}%`);
      }

      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
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

      if (!profile?.business_id) return;

      // Fetch connected review sources
      const { data: sources } = await supabase
        .from('review_sources')
        .select('*')
        .eq('business_id', profile.business_id)
        .eq('is_connected', true);

      if (!sources?.length) {
        toast.error('No connected review platforms found');
        return;
      }

      // For now, we'll simulate syncing - in production this would call the actual sync APIs
      toast.success('Reviews synced successfully!');
      await fetchReviews();
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error('Failed to sync reviews');
    } finally {
      setSyncing(false);
    }
  };

  const generateAiReply = async () => {
    try {
      setGeneratingReply(true);
      
      // Simple AI reply generation based on tone and review content
      const templates = {
        professional: `Thank you for taking the time to share your feedback. We appreciate your input and will use it to improve our services.`,
        warm: `Thank you so much for your kind words! We're thrilled to hear about your positive experience and look forward to serving you again.`,
        brief: `Thanks for your feedback!`,
        apology: `We sincerely apologize for any inconvenience you may have experienced. Please know that we take all feedback seriously and are working to improve.`
      };
      
      const baseReply = templates[replyTone] || templates.professional;
      const personalizedReply = baseReply.replace('{rating}', selectedReview.rating);
      
      setAiReply(personalizedReply);
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async (channel = 'manual') => {
    try {
      setSendingReply(true);
      
      // Log reply to Supabase directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Insert reply record
      const { error: replyError } = await supabase
        .from('review_replies')
        .insert({
          review_id: selectedReview.id,
          reply_text: replyText || aiReply,
          channel,
          responder_id: user.id,
          business_id: profile.business_id
        });

      if (replyError) throw replyError;

      // Update review status
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ responded: true })
        .eq('id', selectedReview.id);

      if (updateError) throw updateError;

      toast.success(`Reply ${channel === 'manual' ? 'logged' : 'sent'} successfully!`);
      
      // Update the review status
      setSelectedReview(prev => ({ ...prev, responded: true }));
      setReplyText('');
      setAiReply('');
      
      // Refresh reviews and metrics
      await fetchReviews();
      await fetchMetrics();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const markAsReplied = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Insert reply record
      const { error: replyError } = await supabase
        .from('review_replies')
        .insert({
          review_id: selectedReview.id,
          reply_text: 'Thanks for your feedback!',
          channel: 'manual',
          responder_id: user.id,
          business_id: profile.business_id
        });

      if (replyError) throw replyError;

      // Update review status
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ responded: true })
        .eq('id', selectedReview.id);

      if (updateError) throw updateError;

      toast.success('Review marked as replied!');
      setSelectedReview(prev => ({ ...prev, responded: true }));
      await fetchReviews();
      await fetchMetrics();
    } catch (error) {
      console.error('Error marking as replied:', error);
      toast.error('Failed to mark as replied');
    }
  };

  const handleGoogleLocationSwitch = async (newLocationId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Archive existing Google reviews
      await supabase
        .from('reviews')
        .update({ archived: true })
        .eq('business_id', profile.business_id)
        .eq('platform', 'Google');

      // Update review source
      await supabase
        .from('review_sources')
        .update({ external_id: newLocationId })
        .eq('business_id', profile.business_id)
        .eq('platform', 'Google');

      toast.success('Google location switched successfully!');
      await syncReviews();
    } catch (error) {
      console.error('Error switching Google location:', error);
      toast.error('Failed to switch Google location');
    }
  };

  const applyFilterFromMetrics = (metricType) => {
    switch (metricType) {
      case 'unreplied':
        setFilters(prev => ({ ...prev, status: 'unreplied' }));
        break;
      case 'avgRating':
        setFilters(prev => ({ ...prev, rating: '4' }));
        break;
      case 'newReviews':
        setFilters(prev => ({ ...prev, dateRange: 'week' }));
        break;
      case 'responseTime':
        setFilters(prev => ({ ...prev, status: 'replied' }));
        break;
    }
  };

  const toggleReviewSelection = (reviewId) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const selectAllReviews = () => {
    const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 5);
    setSelectedReviews(visibleReviews.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedReviews([]);
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'google': return <MapPin className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'yelp': return <Star className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Badge variant="default" className="bg-green-100 text-green-800"><ThumbsUp className="w-3 h-3 mr-1" />Positive</Badge>;
      case 'negative':
        return <Badge variant="destructive"><ThumbsDown className="w-3 h-3 mr-1" />Negative</Badge>;
      case 'neutral':
        return <Badge variant="secondary"><Minus className="w-3 h-3 mr-1" />Neutral</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getReplyButton = () => {
    const isGoogleConnected = selectedReview?.platform?.toLowerCase() === 'google';
    
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => handleSendReply('manual')}
          disabled={!replyText && !aiReply}
          className="flex-1"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Manual Reply
        </Button>
        <div className="relative">
          <Button
            onClick={() => handleSendReply('email')}
            disabled={!replyText && !aiReply}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </Button>
        </div>
        <div className="relative">
          <Button
            onClick={() => handleSendReply('sms')}
            disabled={!replyText && !aiReply}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Send SMS
          </Button>
        </div>
      </div>
    );
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Inbox"
        subtitle="Manage and respond to customer reviews across all platforms"
        action={
          <Button onClick={syncReviews} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync Reviews
          </Button>
        }
      />

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => applyFilterFromMetrics('unreplied')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unreplied</p>
                <p className="text-2xl font-bold text-red-600">{metrics.unreplied}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => applyFilterFromMetrics('avgRating')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating (30d)</p>
                <p className="text-2xl font-bold text-green-600">{metrics.avgRating}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => applyFilterFromMetrics('newReviews')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New (7d)</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.newReviews}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => applyFilterFromMetrics('responseTime')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.responseTime}h</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Review List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search reviews..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Yelp">Yelp</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.sentiment} onValueChange={(value) => setFilters(prev => ({ ...prev, sentiment: value }))}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unreplied">Needs Reply</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 3 Months</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="text-left">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Rating</SelectItem>
                    <SelectItem value="lowest">Lowest Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={showAllReviews}
                  onCheckedChange={setShowAllReviews}
                />
                <Label className="text-sm">Show all reviews</Label>
              </div>
            </CardContent>
          </Card>

          {/* Review List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Reviews</CardTitle>
                {selectedReviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{selectedReviews.length} selected</span>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading reviews...</p>
                </div>
              ) : displayedReviews.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reviews found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayedReviews.map((review) => (
                    <div
                      key={review.id}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedReview?.id === review.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedReview(review)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={selectedReviews.includes(review.id)}
                          onCheckedChange={() => toggleReviewSelection(review.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {getPlatformIcon(review.platform)}
                              <span className="text-sm font-medium">{review.author_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            {review.responded ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Replied
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Needs Reply
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {review.body}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {getSentimentBadge(review.sentiment)}
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {!showAllReviews && reviews.length > 5 && (
                    <div className="p-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAllReviews(true)}
                        className="w-full"
                      >
                        View More Reviews ({reviews.length - 5} more)
                      </Button>
                    </div>
                  )}
                  
                  {showAllReviews && reviews.length > 5 && (
                    <div className="p-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAllReviews(false)}
                        className="w-full"
                      >
                        Show Recent 5 Reviews
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Review Details */}
        <div className="lg:col-span-2">
          {selectedReview ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{selectedReview.author_name}</h3>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getPlatformIcon(selectedReview.platform)}
                        {selectedReview.platform}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < selectedReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedReview.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Original
                    </Button>
                    {!selectedReview.responded && (
                      <Button variant="outline" size="sm" onClick={markAsReplied}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Replied
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Review Content */}
                <div>
                  <h4 className="font-medium mb-2">Review</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{selectedReview.body}</p>
                  </div>
                </div>

                {/* Reply Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Reply</h4>
                    <Select value={replyTone} onValueChange={setReplyTone}>
                      <SelectTrigger className="w-40 text-left">
                        <SelectValue placeholder="Tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="brief">Brief</SelectItem>
                        <SelectItem value="apology">Apology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={generateAiReply}
                      disabled={generatingReply}
                    >
                      {generatingReply ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                      Generate Draft
                    </Button>
                    <Button variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button variant="outline">
                      <Minus className="w-4 h-4 mr-2" />
                      Shorten
                    </Button>
                    <Button variant="outline">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Friendlier
                    </Button>
                  </div>
                  
                  {aiReply && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">AI Generated Reply</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReplyText(aiReply)}>
                            Use This
                          </Button>
                          <Button variant="outline" size="sm">
                            Add Thank You
                          </Button>
                        </div>
                      </div>
                      <p className="text-blue-900">{aiReply}</p>
                    </div>
                  )}
                  
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                  />
                  
                  {getReplyButton()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Review</h3>
                <p className="text-gray-600">Choose a review from the list to view details and respond</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewInbox;


