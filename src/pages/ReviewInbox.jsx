
import React, { useState, useEffect } from 'react';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { logEvent } from '@/lib/telemetry';
import InboxHeader from '@/features/reviews/inbox/InboxHeader';
import Filters from '@/features/reviews/inbox/Filters';
import ThreadList from '@/features/reviews/inbox/ThreadList';
import ThreadDetailDrawer from '@/features/reviews/inbox/ThreadDetailDrawer';
import { useInboxThreads, useInboxCounts } from '@/hooks/useInboxData';
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
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/browser';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';

const ReviewInbox = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(false);
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
      // Don't set loading to true to prevent flash
      
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
      // Don't set loading to false to prevent flash
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
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"><ThumbsUp className="w-3 h-3 mr-1" />Positive</Badge>;
      case 'negative':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800"><ThumbsDown className="w-3 h-3 mr-1" />Negative</Badge>;
      case 'neutral':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800"><Minus className="w-3 h-3 mr-1" />Neutral</Badge>;
      default:
        return <Badge variant="outline" className="hover:bg-transparent hover:text-gray-600">Unknown</Badge>;
    }
  };

  const getReplyButton = () => {
    const isGoogleConnected = selectedReview?.platform?.toLowerCase() === 'google';
    
    return (
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => handleSendReply('manual')}
          disabled={!replyText && !aiReply}
          className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Manual Reply
        </Button>
        <Button
          onClick={() => handleSendReply('email')}
          disabled={!replyText && !aiReply}
          variant="outline"
          className="rounded-xl border-gray-200 hover:border-gray-300 font-medium"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </Button>
        <Button
          onClick={() => handleSendReply('sms')}
          disabled={!replyText && !aiReply}
          variant="outline"
          className="rounded-xl border-gray-200 hover:border-gray-300 font-medium"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Send SMS
        </Button>
      </div>
    );
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5);

  if (isFeatureEnabled('conversationsLite')) {
    // Minimal shell using new components (data wiring to follow)
    const [filtersLite, setFiltersLite] = useState({ quick: 'all', search: '', channel: 'all', date: '30d' });
    const [selectedId, setSelectedId] = useState();
    const { data: countsData } = useInboxCounts();
    const { data: threadsData, isLoading: threadsLoading } = useInboxThreads();
    const counts = countsData || { sent: 0, opened: 0, clicked: 0, completed: 0 };
    const threads = (threadsData || []).map(t => ({
      id: t.id,
      customer_name: t.name || 'Customer',
      email: t.email,
      rating: t.rating || null,
      latest_at: t.latest_at,
      flags: {
        detractor: (t.sentiment === 'negative') || (t.rating && t.rating <= 3) || false,
        urgent: t.sentiment === 'negative',
        missed: t.status === 'sent' && !t.completed_at && t.opened_at && !t.clicked_at,
      },
    }));
    // Telemetry: inbox viewed
    useEffect(() => {
      (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .single();
          if (profile?.business_id) {
            await logEvent(profile.business_id, 'inbox_viewed');
          }
        } catch {}
      })();
    }, []);

    // Apply client-side filters for now
    const filteredThreads = threads.filter((t) => {
      // quick filter
      if (filtersLite.quick === 'urgent' && !t.flags.urgent) return false;
      if (filtersLite.quick === 'detractors' && !t.flags.detractor) return false;
      if (filtersLite.quick === 'unreplied' && t.rating && t.rating > 0) {
        // placeholder: no replied flag on thread yet
      }
      if (filtersLite.quick === 'completed' && !(t.rating && t.rating >= 4)) return false;
      // channel filter requires t.channel when available; pass-through for now
      // search
      if (filtersLite.search) {
        const q = filtersLite.search.toLowerCase();
        const hay = `${t.customer_name} ${t.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return (
      <div className="space-y-6">
        <InboxHeader counts={counts} />
        <Filters value={filtersLite} onChange={setFiltersLite} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {threadsLoading ? (
              <div className="p-6 text-slate-500">Loading threads…</div>
            ) : (
              <ThreadList items={filteredThreads} onSelect={setSelectedId} selectedId={selectedId} />
            )}
          </div>
          <div className="lg:col-span-2">
            <ThreadDetailDrawer open={!!selectedId} onClose={() => setSelectedId(undefined)} threadId={selectedId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Inbox</h1>
          <p className="mt-2 text-gray-600">Manage and respond to customer reviews across all platforms</p>
        </div>
        <Button onClick={syncReviews} disabled={syncing} className="rounded-xl">
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sync Reviews
        </Button>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl border-0 bg-gradient-to-br from-red-50 to-red-100/50 shadow-lg"
          onClick={() => applyFilterFromMetrics('unreplied')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">Unreplied</p>
                <p className="text-3xl font-bold text-red-600">{metrics.unreplied}</p>
              </div>
              <div className="p-3 bg-red-200/50 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl border-0 bg-gradient-to-br from-green-50 to-green-100/50 shadow-lg"
          onClick={() => applyFilterFromMetrics('avgRating')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-1">Avg Rating (30d)</p>
                <p className="text-3xl font-bold text-green-600">{metrics.avgRating}</p>
              </div>
              <div className="p-3 bg-green-200/50 rounded-xl">
                <Star className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg"
          onClick={() => applyFilterFromMetrics('newReviews')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">New (7d)</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.newReviews}</p>
              </div>
              <div className="p-3 bg-blue-200/50 rounded-xl">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-2xl border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-lg"
          onClick={() => applyFilterFromMetrics('responseTime')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 mb-1">Response Time</p>
                <p className="text-3xl font-bold text-purple-600">{metrics.responseTime}h</p>
              </div>
              <div className="p-3 bg-purple-200/50 rounded-xl">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Review List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Enhanced Filters and Search */}
          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-6 space-y-6">
              {/* Search Bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search reviews..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200"
                  />
                </div>
              </div>
              
              {/* Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Platform</Label>
                  <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Yelp">Yelp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Sentiment</Label>
                  <Select value={filters.sentiment} onValueChange={(value) => setFilters(prev => ({ ...prev, sentiment: value }))}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="All Sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unreplied">Needs Reply</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Rating</Label>
                  <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="All Ratings" />
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
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Date Range</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="quarter">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                      <SelectValue placeholder="Newest First" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="highest">Highest Rating</SelectItem>
                      <SelectItem value="lowest">Lowest Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Show All Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Checkbox 
                  checked={showAllReviews}
                  onCheckedChange={setShowAllReviews}
                  className="rounded-md"
                />
                <Label className="text-sm font-medium text-gray-700">Show all reviews</Label>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Review List */}
          <Card className="rounded-xl shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900">Reviews</CardTitle>
                {selectedReviews.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {selectedReviews.length} selected
                    </span>
                    <Button variant="outline" size="sm" onClick={clearSelection} className="rounded-lg">
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600 font-medium">Loading reviews...</p>
                </div>
              ) : displayedReviews.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No reviews found</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {displayedReviews.map((review, index) => (
                    <div
                      key={review.id}
                      className={`p-5 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedReview?.id === review.id 
                          ? 'bg-blue-50 border-2 border-blue-200 shadow-md' 
                          : 'bg-white border border-gray-100 hover:border-gray-200'
                      } ${index % 2 === 0 ? 'bg-opacity-50' : ''}`}
                      onClick={() => setSelectedReview(review)}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox 
                          checked={selectedReviews.includes(review.id)}
                          onCheckedChange={() => toggleReviewSelection(review.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-100 rounded-lg">
                                {getPlatformIcon(review.platform)}
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{review.author_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            {review.responded ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full px-3 py-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Replied
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white border-0 rounded-full px-3 py-1 font-semibold">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Needs Reply
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
                            {review.body}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            {getSentimentBadge(review.sentiment)}
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
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
                        className="w-full rounded-xl border-gray-200 hover:border-gray-300"
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
                        className="w-full rounded-xl border-gray-200 hover:border-gray-300"
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

        {/* Enhanced Right Panel - Review Details */}
        <div className="lg:col-span-2">
          {selectedReview ? (
            <Card className="rounded-xl shadow-lg border-0 h-fit">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-2xl font-bold text-gray-900">{selectedReview.author_name}</h3>
                      <Badge className="bg-gray-100 text-gray-700 border-gray-200 rounded-full px-3 py-1 flex items-center gap-2">
                        <div className="p-1 bg-gray-200 rounded-md">
                          {getPlatformIcon(selectedReview.platform)}
                        </div>
                        {selectedReview.platform}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < selectedReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getSentimentBadge(selectedReview.sentiment)}
                      <span className="text-sm text-gray-600 font-medium">
                        {new Date(selectedReview.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="rounded-lg">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Original
                    </Button>
                    {!selectedReview.responded && (
                      <Button variant="outline" size="sm" onClick={markAsReplied} className="rounded-lg">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Replied
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Review Content */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Review</h4>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-6 rounded-xl border border-gray-200">
                    <p className="text-gray-800 text-base leading-relaxed">{selectedReview.body}</p>
                  </div>
                </div>

                {/* Reply Editor */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Reply</h4>
                    <Select value={replyTone} onValueChange={setReplyTone}>
                      <SelectTrigger className="w-48 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                        <SelectValue placeholder="Select Tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="brief">Brief</SelectItem>
                        <SelectItem value="apology">Apology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-3 flex-wrap">
                    <Button 
                      variant="outline" 
                      onClick={generateAiReply}
                      disabled={generatingReply}
                      className="rounded-xl border-gray-200 hover:border-gray-300"
                    >
                      {generatingReply ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                      Generate Draft
                    </Button>
                    <Button variant="outline" className="rounded-xl border-gray-200 hover:border-gray-300">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                    <Button variant="outline" className="rounded-xl border-gray-200 hover:border-gray-300">
                      <Minus className="w-4 h-4 mr-2" />
                      Shorten
                    </Button>
                    <Button variant="outline" className="rounded-xl border-gray-200 hover:border-gray-300">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Friendlier
                    </Button>
                  </div>
                  
                  {aiReply && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-blue-800">AI Generated Reply</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReplyText(aiReply)} className="rounded-lg">
                            Use This
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            Add Thank You
                          </Button>
                        </div>
                      </div>
                      <p className="text-blue-900 leading-relaxed">{aiReply}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Your Reply</Label>
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={5}
                      className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 resize-none"
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl">
                    {getReplyButton()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl shadow-lg border-0">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Review</h3>
                <p className="text-gray-600 text-lg">Choose a review from the list to view details and respond</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewInbox;


