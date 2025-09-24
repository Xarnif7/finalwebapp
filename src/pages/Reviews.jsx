import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import ReviewsDashboard from '../components/reviews/ReviewsDashboard';
import ReviewsFilters from '../components/reviews/ReviewsFilters';
import ReviewsList from '../components/reviews/ReviewsList';
import ReviewDetailPanel from '../components/reviews/ReviewDetailPanel';
import { ReviewImporter } from '../components/reviews/ReviewImporter';
import ReviewPlatformConnector from '../components/reviews/ReviewPlatformConnector';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState(null);
  const [showPlatformConnector, setShowPlatformConnector] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    status: 'all',
    platform: 'all',
    rating: 'all',
    sentiment: 'all',
    assigned_to: 'all',
    date_range: 'all',
    search: '',
    tags: '',
    topics: '',
    sort_by: 'review_created_at',
    sort_order: 'desc'
  });

  useEffect(() => {
    loadBusinessId();
  }, []);

  useEffect(() => {
    if (businessId) {
      loadReviews();
    }
  }, [businessId, filters]);

  const loadBusinessId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        setBusinessId(profile.business_id);
      }
    } catch (error) {
      console.error('Error loading business ID:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        business_id: businessId,
        ...filters
      });

      const response = await fetch(`/api/reviews?${params}`);
      const data = await response.json();
      
      setReviews(data.reviews || []);
      
      // If no review is selected and we have reviews, select the first one
      if (!selectedReview && data.reviews?.length > 0) {
        setSelectedReview(data.reviews[0]);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      platform: 'all',
      rating: 'all',
      sentiment: 'all',
      assigned_to: 'all',
      date_range: 'all',
      search: '',
      tags: '',
      topics: '',
      sort_by: 'review_created_at',
      sort_order: 'desc'
    });
  };

  const handleSelectReview = (review) => {
    setSelectedReview(review);
  };

  const handleReviewAction = async (review, action) => {
    switch (action) {
      case 'assign':
        // TODO: Implement assign action
        break;
      case 'tag':
        // TODO: Implement tag action
        break;
      case 'escalate':
        // TODO: Implement escalate action
        break;
      case 'menu':
        // TODO: Implement menu action
        break;
      default:
        break;
    }
  };

  const handleUpdateReview = async (reviewId, updates) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Update local state
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, ...updates } : r
        ));
        
        if (selectedReview?.id === reviewId) {
          setSelectedReview(prev => ({ ...prev, ...updates }));
        }
        
        // Reload reviews to get latest data
        loadReviews();
      }
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleReviewAdded = (newReview) => {
    setReviews(prev => [newReview, ...prev]);
  };

  const handleGenerateAIResponse = async (review) => {
    // This will be handled in the ReviewDetailPanel component
  };

  const handleSaveTemplate = async (template) => {
    // TODO: Implement save template
  };

  const handleAssign = async (reviewId, assignedTo) => {
    // TODO: Implement assign functionality
  };

  const handleTag = async (reviewId, tags) => {
    // TODO: Implement tag functionality
  };

  const handleEscalate = async (reviewId) => {
    // TODO: Implement escalate functionality
  };

  const handlePlatformsConnected = () => {
    // Refresh reviews when platforms are connected
    loadReviews();
  };

  if (activeTab === 'requests') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
              <p className="text-gray-600 mt-1">Manage and respond to customer reviews</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'inbox'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Review Inbox
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Send Requests
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send New Requests */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Send New Requests</h2>
              <p className="text-gray-600 mb-6">
                Send review requests to customers after completing their service.
              </p>
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Send Review Request
              </button>
            </div>

            {/* Request History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Request History</h2>
              <p className="text-gray-600 mb-6">
                View and manage your review request history and performance.
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
              <p className="text-gray-600 mt-1">Professional review management system</p>
            </div>
            <div className="flex items-center space-x-4">
              {reviews.length > 0 && (
                <button
                  onClick={() => setShowPlatformConnector(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Platforms
                </button>
              )}
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Review Inbox
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Send Requests
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* KPI Dashboard */}
        <ReviewsDashboard 
          businessId={businessId} 
          onFilterChange={handleFiltersChange}
        />

        {/* Main Content */}
        {showPlatformConnector ? (
          <div className="max-w-4xl mx-auto">
            <ReviewPlatformConnector onPlatformsConnected={handlePlatformsConnected} />
          </div>
        ) : reviews.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-600 mb-4">
                Connect your review platforms to automatically import reviews, or add them manually.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowPlatformConnector(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Connect Review Platforms
              </button>
              <button
                onClick={() => setShowPlatformConnector(false)}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Add Reviews Manually
              </button>
            </div>
            <div className="mt-4">
              <ReviewImporter onReviewAdded={handleReviewAdded} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
            {/* Filters - Left Column */}
            <div className="col-span-3">
              <ReviewsFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            </div>

            {/* Reviews List - Middle Column */}
            <div className="col-span-4">
              <div className="h-full overflow-y-auto">
                <ReviewsList
                  reviews={reviews}
                  selectedReview={selectedReview}
                  onSelectReview={handleSelectReview}
                  onAction={handleReviewAction}
                  loading={loading}
                />
              </div>
            </div>

            {/* Review Detail - Right Column */}
            <div className="col-span-5">
              <div className="h-full overflow-y-auto">
                <ReviewDetailPanel
                  review={selectedReview}
                  onUpdateReview={handleUpdateReview}
                  onGenerateAIResponse={handleGenerateAIResponse}
                  onSaveTemplate={handleSaveTemplate}
                  onAssign={handleAssign}
                  onTag={handleTag}
                  onEscalate={handleEscalate}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}