import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Star, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare,
  Eye,
  Heart,
  MoreHorizontal,
  User,
  Calendar,
  Tag,
  Square,
  CheckSquare
} from 'lucide-react';

const platformConfig = {
  google: { name: 'Google', icon: '🔍', color: 'bg-blue-100 text-blue-800' },
  facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-600' },
  yelp: { name: 'Yelp', icon: '🔴', color: 'bg-red-100 text-red-800' },
  bbb: { name: 'BBB', icon: '🏆', color: 'bg-yellow-100 text-yellow-800' }
};

const statusConfig = {
  unread: { name: 'Unread', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  needs_response: { name: 'Needs Response', color: 'bg-orange-100 text-orange-800', icon: Clock },
  responded: { name: 'Responded', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  resolved: { name: 'Resolved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  edited_since_response: { name: 'Edited', color: 'bg-purple-100 text-purple-800', icon: MessageSquare }
};

const getTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
};

const getSLAStatus = (dueAt, status) => {
  if (!dueAt || status === 'responded' || status === 'resolved') return null;
  
  const due = new Date(dueAt);
  const now = new Date();
  const hoursUntilDue = Math.floor((due - now) / (1000 * 60 * 60));
  
  if (hoursUntilDue < 0) {
    return { status: 'overdue', text: 'Overdue', color: 'text-red-600' };
  } else if (hoursUntilDue < 2) {
    return { status: 'urgent', text: `${hoursUntilDue}h left`, color: 'text-orange-600' };
  } else {
    return { status: 'normal', text: `${hoursUntilDue}h left`, color: 'text-gray-600' };
  }
};

const ReviewCard = ({ review, isSelected, onSelect, onAction, isBulkSelectMode, isChecked, onToggleCheck }) => {
  const platform = platformConfig[review.platform] || { name: review.platform, icon: '📱', color: 'bg-gray-100 text-gray-800' };
  const status = statusConfig[review.status] || { name: review.status, color: 'bg-gray-100 text-gray-800', icon: MessageSquare };
  const slaStatus = getSLAStatus(review.due_at, review.status);
  const StatusIcon = status.icon;

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600';
    if (rating === 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      onClick={() => !isBulkSelectMode && onSelect(review)}
    >
      <Card className={`hover:shadow-lg transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:border-gray-300'
      }`}>
        <CardContent className="p-4">
          {/* Bulk Select Checkbox */}
          {isBulkSelectMode && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggleCheck(review.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm text-gray-600">Select for bulk action</span>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded text-xs font-medium ${platform.color}`}>
                {platform.icon} {platform.name}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < review.rating ? getRatingColor(review.rating) : 'text-gray-300'
                    } fill-current`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-xs ${status.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.name}
              </Badge>
              {slaStatus && (
                <span className={`text-xs ${slaStatus.color}`}>
                  {slaStatus.text}
                </span>
              )}
            </div>
          </div>

          {/* Reviewer Info */}
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">{review.reviewer_name}</span>
            <span className="text-gray-500">•</span>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Calendar className="w-3 h-3" />
              {getTimeAgo(review.review_created_at)}
            </div>
          </div>

          {/* Review Text Preview */}
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {review.review_text}
          </p>

          {/* Tags and Topics */}
          {(review.tags?.length > 0 || review.topics?.length > 0) && (
            <div className="flex flex-wrap gap-1 mb-3">
              {review.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {review.topics?.slice(0, 1).map((topic, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {(review.tags?.length > 2 || review.topics?.length > 1) && (
                <Badge variant="outline" className="text-xs">
                  +{((review.tags?.length || 0) - 2) + ((review.topics?.length || 0) - 1)}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-500 text-sm">
              {review.views_count > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {review.views_count}
                </div>
              )}
              {review.likes_count > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {review.likes_count}
                </div>
              )}
              {review.job_type && (
                <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {review.job_type}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(review, 'menu');
              }}
              className="h-8 w-8 p-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function ReviewsList({ 
    reviews, 
    selectedReview, 
    onSelectReview, 
    onAction,
    onBulkAction,
    loading = false 
}) {
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedReviewIds, setSelectedReviewIds] = useState(new Set());

  const handleToggleCheck = (reviewId) => {
    const newSelected = new Set(selectedReviewIds);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviewIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReviewIds.size === reviews.length) {
      setSelectedReviewIds(new Set());
    } else {
      setSelectedReviewIds(new Set(reviews.map(r => r.id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedReviewIds.size === 0) return;
    
    const selectedReviews = reviews.filter(r => selectedReviewIds.has(r.id));
    
    if (onBulkAction) {
      await onBulkAction(action, selectedReviews);
      setSelectedReviewIds(new Set());
      setIsBulkSelectMode(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-500">
            Try adjusting your filters or import some reviews to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {isBulkSelectMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedReviewIds.size === reviews.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedReviewIds.size === reviews.length ? 'Deselect All' : 'Select All'}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedReviewIds.size} of {reviews.length} selected
                </span>
              </div>
              
              {selectedReviewIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('mark_resolved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('assign_to_me')}
                  >
                    <User className="w-4 h-4 mr-1" />
                    Assign to Me
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('escalate')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Escalate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsBulkSelectMode(false);
                      setSelectedReviewIds(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle Bulk Select Mode */}
      {!isBulkSelectMode && reviews.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkSelectMode(true)}
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            Bulk Actions
          </Button>
        </div>
      )}

      {/* Reviews List */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isSelected={selectedReview?.id === review.id}
          onSelect={onSelectReview}
          onAction={onAction}
          isBulkSelectMode={isBulkSelectMode}
          isChecked={selectedReviewIds.has(review.id)}
          onToggleCheck={handleToggleCheck}
        />
      ))}
    </div>
  );
}
