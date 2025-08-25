
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
  Minus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  SortAsc,
  SortDesc
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
    search: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyTone, setReplyTone] = useState('professional');
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
        .eq('is_replied', false);

      // Get average rating (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', profile.business_id)
        .gte('review_created_at', thirtyDaysAgo.toISOString());

      const avgRating = recentReviews && recentReviews.length > 0 
        ? (recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length).toFixed(1)
        : 0;

      // Get new reviews count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: newReviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.business_id)
        .gte('review_created_at', sevenDaysAgo.toISOString());

      // Calculate median response time (placeholder for now)
      const responseTime = 2.4; // hours

      setMetrics({
        unreplied: unrepliedCount || 0,
        avgRating: parseFloat(avgRating),
        newReviews: newReviewsCount || 0,
        responseTime
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

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
        .eq('business_id', profile.business_id);

      // Apply filters
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }

      if (filters.status !== 'all') {
        if (filters.status === 'replied') {
          query = query.eq('is_replied', true);
        } else if (filters.status === 'unreplied') {
          query = query.eq('is_replied', false);
        }
      }

      if (filters.rating !== 'all') {
        const ratingMap = { '5': 5, '4': 4, '3': 3, '2': 2, '1': 1 };
        if (ratingMap[filters.rating]) {
          query = query.eq('rating', ratingMap[filters.rating]);
        }
      }

      if (filters.search) {
        query = query.or(`reviewer_name.ilike.%${filters.search}%,text.ilike.%${filters.search}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('review_created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('review_created_at', { ascending: true });
          break;
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
        default:
          query = query.order('review_created_at', { ascending: false });
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

      // Get connected review sources
      const { data: reviewSources, error: sourcesError } = await supabase
        .from('review_sources')
        .select('*')
        .eq('business_id', profile.business_id)
        .eq('connected', true);

      if (sourcesError) {
        throw sourcesError;
      }

      if (!reviewSources || reviewSources.length === 0) {
        toast.error('No connected review platforms found. Please connect platforms in Settings first.');
        return;
      }

      let totalInserted = 0;
      let totalUpdated = 0;

             // Fetch real reviews from connected platforms
       for (const source of reviewSources) {
         if (source.platform === 'google' && source.external_id) {
           try {
             console.log(`Starting to sync Google reviews for place ID: ${source.external_id}`);
             
             // Fetch real Google Places reviews
             const googleReviews = await fetchGooglePlacesReviews(source.external_id);
             console.log(`Successfully fetched ${googleReviews.length} Google reviews`);
             
             if (googleReviews.length === 0) {
               toast.info('No reviews found for this Google business. This might be normal if the business is new or has no reviews yet.');
               continue;
             }
             
             for (const review of googleReviews) {
               // Debug the review object structure
               console.log('Review object structure:', review);
               console.log('Review ID:', review.id, 'Review author_name:', review.author_name);
               
               // Google Places API might use different property names
               const reviewId = review.id || review.review_id || review.place_id || `google_${Date.now()}_${Math.random()}`;
               const authorName = review.author_name || review.authorName || review.name || 'Anonymous';
               const reviewText = review.text || review.review_text || review.comment || '';
               const reviewRating = review.rating || review.stars || 0;
               const reviewTime = review.time || review.timestamp || Date.now();
               const reviewUrl = review.url || review.review_url || source.public_url;
               
               console.log(`Processing review: ${authorName} - ${reviewRating} stars (ID: ${reviewId})`);
               
               // Check if review already exists
               const { data: existingReview } = await supabase
                 .from('reviews')
                 .select('id')
                 .eq('business_id', profile.business_id)
                 .eq('platform', 'google')
                 .eq('external_review_id', reviewId)
                 .single();

               if (!existingReview) {
                 // Insert new review
                 const { error: insertError } = await supabase
                   .from('reviews')
                   .insert({
                     business_id: profile.business_id,
                     platform: 'google',
                     external_review_id: reviewId,
                     reviewer_name: authorName,
                     rating: reviewRating,
                     text: reviewText,
                     review_url: reviewUrl,
                     review_created_at: new Date(reviewTime * 1000).toISOString(),
                     sentiment: classifySentiment(reviewText, reviewRating)
                   });

                 if (!insertError) {
                   totalInserted++;
                   console.log(`Inserted new review from ${review.author_name}`);
                 } else {
                   console.error(`Error inserting review:`, insertError);
                 }
               } else {
                 // Update existing review
                 const { error: updateError } = await supabase
                   .from('reviews')
                   .update({
                     reviewer_name: authorName,
                     rating: reviewRating,
                     text: reviewText,
                     review_url: reviewUrl,
                     review_created_at: new Date(reviewTime * 1000).toISOString(),
                     sentiment: classifySentiment(reviewText, reviewRating),
                     updated_at: new Date().toISOString()
                   })
                   .eq('id', existingReview.id);

                 if (!updateError) {
                   totalUpdated++;
                   console.log(`Updated existing review from ${review.author_name}`);
                 } else {
                   console.error(`Error updating review:`, updateError);
                 }
               }
             }
           } catch (error) {
             console.error(`Error syncing Google reviews:`, error);
             toast.error(`Failed to sync Google reviews: ${error.message}`);
           }
         }
       }

      toast.success(`Sync completed! ${totalInserted} new reviews, ${totalUpdated} updated.`);
      fetchReviews(); // Refresh reviews after sync
      
    } catch (error) {
      console.error('Error syncing reviews:', error);
      toast.error('Failed to sync reviews');
    } finally {
      setSyncing(false);
    }
  };

  // Load Google Maps API if not already loaded
  const loadGoogleMapsAPI = async () => {
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API already loaded');
      return true;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps API loaded successfully for Review Inbox');
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };
      document.head.appendChild(script);
    });
  };

  // Fetch real Google Places reviews using the newer API approach
  const fetchGooglePlacesReviews = async (placeId) => {
    try {
      // Ensure Google Maps API is loaded
      await loadGoogleMapsAPI();

      // Check if Google Maps API is loaded
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        throw new Error('Google Maps API not loaded');
      }

      // Use the newer fetchPlace method if available, otherwise fallback to PlacesService
      if (window.google.maps.places.Place && window.google.maps.places.Place.prototype.fetchPlace) {
        // Use the new Place API
        const place = new window.google.maps.places.Place({
          placeId: placeId,
          fields: ['reviews', 'place_id', 'url']
        });

        return new Promise((resolve, reject) => {
          place.fetchPlace((placeDetails, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
              const reviews = placeDetails.reviews || [];
              console.log(`Fetched ${reviews.length} Google reviews using new Place API for place ${placeId}`);
              resolve(reviews);
            } else {
              reject(new Error(`Google Places API error: ${status}`));
            }
          });
        });
      } else {
        // Fallback to PlacesService (deprecated but still functional)
        return new Promise((resolve, reject) => {
          const service = new window.google.maps.places.PlacesService(document.createElement('div'));
          
          service.getDetails(
            {
              placeId: placeId,
              fields: ['reviews', 'place_id', 'url']
            },
            (place, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                const reviews = place.reviews || [];
                console.log(`Fetched ${reviews.length} Google reviews using PlacesService for place ${placeId}`);
                resolve(reviews);
              } else {
                reject(new Error(`Google Places API error: ${status}`));
              }
            }
          );
        });
      }
    } catch (error) {
      console.error('Error fetching Google Places reviews:', error);
      throw error;
    }
  };

  // Classify sentiment based on review text and rating
  const classifySentiment = (text, rating) => {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    return 'neutral';
  };

  const handleFilterChange = (filter, value) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };

  const applyFilterFromMetrics = (filterType) => {
    switch (filterType) {
      case 'unreplied':
        setFilters(prev => ({ ...prev, status: 'unreplied' }));
        break;
      case 'lowRating':
        setFilters(prev => ({ ...prev, rating: '1', sentiment: 'negative' }));
        break;
      case 'recent':
        setFilters(prev => ({ ...prev, platform: 'all', sentiment: 'all', status: 'all', rating: 'all' }));
        break;
      default:
        break;
    }
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
          tone: replyTone,
          business_context: `Business ID: ${profile.business_id}`
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setAiReply(result.reply);
        setReplyText(result.reply);
        toast.success(`Generated ${replyTone} tone reply`);
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

  const handleGoogleLocationSwitch = async (newPlaceId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Archive existing Google reviews for this business
      const { error: archiveError } = await supabase
        .from('reviews')
        .update({ 
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('business_id', profile.business_id)
        .eq('platform', 'google');

      if (archiveError) {
        console.error('Error archiving reviews:', archiveError);
        toast.error('Failed to archive existing Google reviews');
        return;
      }

      // Update the review source with new place ID
      const { error: updateError } = await supabase
        .from('review_sources')
        .update({ 
          external_id: newPlaceId,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', profile.business_id)
        .eq('platform', 'google');

      if (updateError) {
        console.error('Error updating review source:', updateError);
        toast.error('Failed to update Google location');
        return;
      }

      toast.success('Google location updated. Running full sync for new location...');
      
      // Run a full sync for the new location
      await syncReviews();
      
    } catch (error) {
      console.error('Error switching Google location:', error);
      toast.error('Failed to switch Google location');
    }
  };

  const handleSendReply = async (channel = 'manual') => {
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

      // Call the API endpoint to log the reply
      const response = await fetch('/api/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          replyText: replyText,
          channel: channel,
          responderId: user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save reply');
      }

      // Handle platform-specific actions based on channel
      if (channel === 'manual') {
        if (selectedReview.platform === 'facebook') {
          // Try to post reply via Facebook API
          try {
            const fbResponse = await fetch('/api/reviews/reply/facebook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                business_id: profile.business_id,
                review_id: selectedReview.id,
                reply_text: replyText
              })
            });

            const fbResult = await fbResponse.json();
            
            if (fbResponse.ok) {
              toast.success('Reply posted to Facebook!');
            } else if (fbResult.code === 'PERMISSION_DENIED') {
              toast.info('Reply not permitted - use Copy & Open Facebook');
            } else {
              toast.error(`Facebook reply failed: ${fbResult.error}`);
            }
          } catch (error) {
            toast.info('Use Copy & Open Facebook to post reply');
          }
        } else if (selectedReview.platform === 'google') {
          // For Google, check if GBP is connected
          const isGoogleConnected = selectedReview.external_id && selectedReview.external_id.length > 10;
          if (isGoogleConnected) {
            toast.success('Reply logged! Use Copy & Open Google to post.');
          } else {
            toast.info('Google Business Profile not connected. Use Copy & Open Google instead.');
          }
        } else {
          // For Yelp and other platforms
          toast.success('Reply logged! Use Copy & Open Yelp to post.');
        }
      } else if (channel === 'email') {
        toast.success('Email reply logged! Email functionality will be implemented soon.');
      } else if (channel === 'sms') {
        toast.success('SMS reply logged! SMS functionality will be implemented soon.');
      }

      // Refresh reviews and metrics
      await fetchReviews();
      await fetchMetrics();
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const markAsReplied = async (reviewId) => {
    try {
      const response = await fetch('/api/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: reviewId,
          replyText: 'Thanks for your feedback!',
          channel: 'manual',
          responderId: user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as replied');
      }

      toast.success('Review marked as replied!');
      await fetchReviews();
      await fetchMetrics();
    } catch (error) {
      console.error('Error marking as replied:', error);
      toast.error(error.message || 'Failed to mark as replied');
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

    // Check if Google Business Profile is connected for this business
    const isGoogleConnected = selectedReview.platform === 'google' && selectedReview.external_id;

    if (selectedReview.platform === 'facebook') {
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => handleSendReply('manual')}
            disabled={!replyText.trim() || sendingReply}
            className="flex-1"
          >
            {sendingReply ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Log Manual Reply
          </Button>
          <Button
            onClick={() => handleSendReply('email')}
            disabled={!replyText.trim() || sendingReply}
            variant="outline"
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Email Reply
          </Button>
          <Button
            onClick={() => handleSendReply('sms')}
            disabled={!replyText.trim() || sendingReply}
            variant="outline"
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Send SMS Reply
          </Button>
        </div>
      );
    } else if (selectedReview.platform === 'google' && isGoogleConnected) {
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => handleSendReply('manual')}
            disabled={!replyText.trim() || sendingReply}
            className="flex-1"
          >
            {sendingReply ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send via Google Business
          </Button>
          <Button
            onClick={copyReply}
            disabled={!replyText.trim()}
            variant="outline"
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Reply
          </Button>
        </div>
      );
    } else {
      // For Yelp and unconnected Google, show copy + open options
      return (
        <div className="flex gap-2">
          <Button
            onClick={() => handleSendReply('manual')}
            disabled={!replyText.trim() || sendingReply}
            variant="outline"
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Log Manual Reply
          </Button>
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
            Open on {selectedReview.platform === 'google' ? 'Google' : 'Yelp'}
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

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          onClick={() => applyFilterFromMetrics('recent')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                <p className="text-2xl font-bold text-foreground">{metrics.avgRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          onClick={() => applyFilterFromMetrics('recent')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                <p className="text-2xl font-bold text-foreground">{metrics.responseTime.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          onClick={() => applyFilterFromMetrics('unreplied')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unreplied</p>
                <p className="text-2xl font-bold text-foreground">{metrics.unreplied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          onClick={() => applyFilterFromMetrics('recent')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">New (7d)</p>
                <p className="text-2xl font-bold text-foreground">{metrics.newReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <SelectTrigger className="w-40 text-left">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-left">All Platforms</SelectItem>
              <SelectItem value="google" className="text-left">Google</SelectItem>
              <SelectItem value="facebook" className="text-left">Facebook</SelectItem>
              <SelectItem value="yelp" className="text-left">Yelp</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sentiment}
            onValueChange={(value) => handleFilterChange('sentiment', value)}
          >
            <SelectTrigger className="w-40 text-left">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-left">All Sentiments</SelectItem>
              <SelectItem value="positive" className="text-left">Positive</SelectItem>
              <SelectItem value="neutral" className="text-left">Neutral</SelectItem>
              <SelectItem value="negative" className="text-left">Negative</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-40 text-left">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-left">All Statuses</SelectItem>
              <SelectItem value="replied" className="text-left">Replied</SelectItem>
              <SelectItem value="unreplied" className="text-left">Unreplied</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.rating}
            onValueChange={(value) => handleFilterChange('rating', value)}
          >
            <SelectTrigger className="w-40 text-left">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-left">All Ratings</SelectItem>
              <SelectItem value="5" className="text-left">5 Stars</SelectItem>
              <SelectItem value="4" className="text-left">4 Stars</SelectItem>
              <SelectItem value="3" className="text-left">3 Stars</SelectItem>
              <SelectItem value="2" className="text-left">2 Stars</SelectItem>
              <SelectItem value="1" className="text-left">1 Star</SelectItem>
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

      {/* Sort and Show All */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value)}
          >
            <SelectTrigger className="w-32 text-left">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-left">Newest</SelectItem>
              <SelectItem value="oldest" className="text-left">Oldest</SelectItem>
              <SelectItem value="highest" className="text-left">Highest Rating</SelectItem>
              <SelectItem value="lowest" className="text-left">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
          <input
            type="checkbox"
            id="showAllReviews"
            checked={showAllReviews}
            onChange={(e) => setShowAllReviews(e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <label htmlFor="showAllReviews" className="text-sm text-muted-foreground">Show All</label>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </div>
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
                <div className="space-y-2">
                  {/* Show only 5 reviews by default */}
                  {(showAllReviews ? reviews : reviews.slice(0, 5)).map((review) => (
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
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Replied
                            </Badge>
                          )}
                          {!review.is_replied && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Reply
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.review_created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* View More Button */}
                  {!showAllReviews && reviews.length > 5 && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllReviews(true)}
                        className="w-full"
                      >
                        <ChevronDown className="h-4 w-4 mr-2" />
                        View More Reviews ({reviews.length - 5} more)
                      </Button>
                    </div>
                  )}
                  
                  {/* Collapse Button */}
                  {showAllReviews && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllReviews(false)}
                        className="w-full"
                      >
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Recent 5 Reviews
                      </Button>
                    </div>
                  )}
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
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => markAsReplied(selectedReview.id)}
                            disabled={sendingReply}
                            variant="outline"
                            size="sm"
                          >
                            {sendingReply ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Mark as Replied
                          </Button>
                          <Select
                            value={replyTone}
                            onValueChange={setReplyTone}
                          >
                            <SelectTrigger className="w-32 text-left">
                              <SelectValue placeholder="Tone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional" className="text-left">Professional</SelectItem>
                              <SelectItem value="warm" className="text-left">Warm</SelectItem>
                              <SelectItem value="brief" className="text-left">Brief</SelectItem>
                              <SelectItem value="apology" className="text-left">Apology</SelectItem>
                            </SelectContent>
                          </Select>
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
                      </div>

                      {aiReply && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="font-medium text-blue-800 mb-2">AI Generated Reply ({replyTone} tone):</div>
                          <p className="text-sm text-blue-700">{aiReply}</p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReplyText(aiReply)}
                              className="text-xs"
                            >
                              Use This
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReplyText(aiReply + ' Thank you for your feedback!')}
                              className="text-xs"
                            >
                              Add Thank You
                            </Button>
                          </div>
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


