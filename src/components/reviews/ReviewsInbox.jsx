import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Star, 
  MessageSquare, 
  Clock, 
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ReviewDetailPanel from './ReviewDetailPanel';

// Force cache refresh - v2

const ReviewsInbox = ({ onReviewsChange }) => {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadReviews();
  }, []);

  // Force cache refresh - v4

  const loadReviews = async (reset = true) => {
    try {
      console.log('=== REVIEWS INBOX DEBUG ===');
      console.log('Loading reviews, reset:', reset);
      
      if (reset) {
        setIsLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('User from auth:', user?.email);
      if (!user) {
        console.log('No user found, returning');
        return;
      }

      const params = new URLSearchParams({
        limit: '15'
      });

      if (!reset && reviews.length > 0) {
        params.append('before', reviews[reviews.length - 1].review_created_at);
      }

      const url = `/api/reviews?${params}`;
      console.log('Making API call to:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      
      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      
          if (data.success) {
            console.log('Reviews loaded successfully:', data.reviews?.length);
            console.log('Review statuses:', data.reviews?.map(r => ({ name: r.reviewer_name, status: r.status, rating: r.rating, sentiment: r.sentiment })));
            if (reset) {
              setReviews(data.reviews || []);
              // Pass reviews to parent component
              if (onReviewsChange) {
                onReviewsChange(data.reviews || []);
              }
            } else {
              setReviews(prev => [...prev, ...(data.reviews || [])]);
            }
            setHasMore(data.has_more || false);
            setTotalCount(data.total_count || 0);
          } else {
            console.error('API returned success: false:', data.error);
          }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreReviews = async () => {
    setIsLoadingMore(true);
    try {
      await loadReviews(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleReviewSelect = async (review) => {
    console.log('=== REVIEW SELECT DEBUG ===');
    console.log('Selected review:', review);
    console.log('Current status:', review.status);
    
    setSelectedReview(review);
    
    // Mark as read if it's unread
    if (review.status === 'unread') {
      console.log('Marking review as read...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found');
          return;
        }

        console.log('Updating review status to read...');
        
        // Use the API endpoint instead of direct Supabase call
        const response = await fetch('/api/reviews/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            review_id: review.id,
            updates: { status: 'read' }
          })
        });

        if (response.ok) {
          console.log('Successfully marked review as read');
          // Update the review in the local state
          setReviews(prev => prev.map(r => 
            r.id === review.id ? { ...r, status: 'read' } : r
          ));
        } else {
          const errorData = await response.json();
          console.error('Error marking review as read:', errorData);
        }
      } catch (error) {
        console.error('Error marking review as read:', error);
      }
    } else {
      console.log('Review is already read or not unread');
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesFilter = filter === 'all' || 
      (filter === 'unread' && review.status === 'unread') ||
      (filter === 'read' && review.status === 'read') ||
      (filter === 'needs_response' && review.status === 'needs_response') ||
      (filter === 'responded' && review.status === 'responded');
    
    const matchesSearch = !searchQuery || 
      review.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || 
      (ratingFilter === '5' && review.rating === 5) ||
      (ratingFilter === '4' && review.rating === 4) ||
      (ratingFilter === '3' && review.rating === 3) ||
      (ratingFilter === '2' && review.rating === 2) ||
      (ratingFilter === '1' && review.rating === 1) ||
      (ratingFilter === 'low' && review.rating <= 2) ||
      (ratingFilter === 'high' && review.rating >= 4);
    
    const matchesPlatform = platformFilter === 'all' || 
      review.platform.toLowerCase() === platformFilter.toLowerCase();
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && new Date(review.review_created_at).toDateString() === new Date().toDateString()) ||
      (dateFilter === 'week' && (new Date() - new Date(review.review_created_at)) <= 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === 'month' && (new Date() - new Date(review.review_created_at)) <= 30 * 24 * 60 * 60 * 1000) ||
      (dateFilter === 'quarter' && (new Date() - new Date(review.review_created_at)) <= 90 * 24 * 60 * 60 * 1000);
    
    return matchesFilter && matchesSearch && matchesRating && matchesPlatform && matchesDate;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      unread: { color: 'bg-blue-100 text-blue-800', label: 'Unread' },
      read: { color: 'bg-gray-100 text-gray-800', label: 'Read' },
      needs_response: { color: 'bg-yellow-100 text-yellow-800', label: 'Needs Response' },
      responded: { color: 'bg-green-100 text-green-800', label: 'Responded' },
      resolved: { color: 'bg-gray-100 text-gray-800', label: 'Resolved' }
    };
    
    const config = statusConfig[status] || statusConfig.unread;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'google':
        return '🔍';
      case 'facebook':
        return '📘';
      case 'yelp':
        return '💛';
      default:
        return '📝';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Reviews List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Reviews Inbox</h2>
            <Button variant="outline" size="sm" onClick={loadReviews}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Basic Filters */}
          <div className="flex gap-2 mb-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' },
              { key: 'needs_response', label: 'Needs Response' },
              { key: 'responded', label: 'Responded' }
            ].map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={filter === filterOption.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption.key)}
              >
                {filterOption.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Advanced
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-lg p-3 mb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Rating Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rating</label>
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                    <option value="high">High (4-5 Stars)</option>
                    <option value="low">Low (1-2 Stars)</option>
                  </select>
                </div>

                {/* Platform Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="all">All Platforms</option>
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="yelp">Yelp</option>
                    <option value="bbb">BBB</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="quarter">Last 90 Days</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Showing {filteredReviews.length} of {reviews.length} reviews
              </div>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto">
          {filteredReviews.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No reviews found</p>
              <p className="text-sm">Connect your Google Business profile to start importing reviews</p>
            </div>
          ) : (
            <>
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedReview?.id === review.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => handleReviewSelect(review)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPlatformIcon(review.platform)}</span>
                      <div>
                        <h4 className="font-medium text-sm">{review.reviewer_name}</h4>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(review.status)}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(review.review_created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {review.review_text}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">
                      {review.platform} • {review.sentiment}
                    </span>
                    {review.reply_text && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Replied
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {(hasMore || reviews.length < totalCount) && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      Showing {reviews.length} of {totalCount} reviews
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={loadMoreReviews}
                    disabled={isLoadingMore}
                    className="w-full"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading more reviews...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Load More Reviews
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Review Detail */}
      <div className="flex-1">
            {selectedReview ? (
              <ReviewDetailPanel 
                review={selectedReview} 
                onUpdateReview={async (reviewId, updates) => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { error } = await supabase
                      .from('reviews')
                      .update(updates)
                      .eq('id', reviewId)
                      .eq('created_by', user.email);

                    if (error) throw error;

                    // Reload reviews to show updated data
                    await loadReviews();
                  } catch (error) {
                    console.error('Error updating review:', error);
                  }
                }}
                onGenerateAIResponse={async (review) => {
                  console.log('Generating AI response for review:', review.id);
                  // This will be handled by the ReviewDetailPanel component
                }}
                onSaveTemplate={async (template) => {
                  console.log('Saving template:', template);
                  // TODO: Implement template saving
                }}
                onAssign={async (reviewId, assignee) => {
                  console.log('Assigning review:', reviewId, 'to', assignee);
                  // TODO: Implement assignment
                }}
                onTag={async (reviewId, tag) => {
                  console.log('Tagging review:', reviewId, 'with', tag);
                  // TODO: Implement tagging
                }}
                onEscalate={async (reviewId) => {
                  console.log('Escalating review:', reviewId);
                  // TODO: Implement escalation
                }}
              />
            ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a Review</h3>
              <p>Choose a review from the list to view details and respond</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsInbox;
