import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Star, 
  User, 
  Calendar,
  Phone,
  Mail,
  Eye,
  CheckCircle,
  AlertTriangle,
  Smile
} from 'lucide-react';
import { supabase } from '../../lib/supabase/browser';

const getSentimentConfig = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return { color: 'bg-green-100 text-green-800', icon: Smile, label: 'Positive' };
    case 'neutral':
      return { color: 'bg-yellow-100 text-yellow-800', icon: MessageSquare, label: 'Neutral' };
    case 'negative':
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Negative' };
    default:
      return { color: 'bg-gray-100 text-gray-800', icon: MessageSquare, label: 'Unknown' };
  }
};

const getTimeAgo = (dateString) => {
  if (!dateString) return 'Unknown';
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

const renderStars = (rating) => {
  if (!rating) return null;
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const PrivateFeedbackCard = ({ feedback, onView }) => {
  const sentimentConfig = getSentimentConfig(feedback.sentiment);
  const SentimentIcon = sentimentConfig.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(feedback)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${sentimentConfig.color}`}>
              <SentimentIcon className="w-3 h-3 mr-1" />
              {sentimentConfig.label}
            </Badge>
            {feedback.rating && (
              <div className="flex items-center gap-1">
                {renderStars(feedback.rating)}
                <span className="text-xs text-gray-500 ml-1">{feedback.rating}/5</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <Calendar className="w-3 h-3" />
            {getTimeAgo(feedback.created_at)}
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {feedback.review_requests?.customers?.full_name || 'Anonymous'}
          </div>
          {feedback.review_requests?.customers?.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {feedback.review_requests.customers.email}
            </div>
          )}
        </div>

        {/* Message */}
        {feedback.message && (
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {feedback.message}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {feedback.category && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {feedback.category.replace('_', ' ')}
              </span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(feedback);
            }}
            className="h-8 w-8 p-0"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PrivateFeedbackInbox({ businessId, onSelectFeedback }) {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (businessId) {
      loadFeedback();
    }
  }, [businessId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/private-feedback?business_id=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback || []);

    } catch (err) {
      console.error('Error loading private feedback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFeedback = (feedbackItem) => {
    if (onSelectFeedback) {
      onSelectFeedback(feedbackItem);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <CardContent className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Feedback</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadFeedback} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!feedback || feedback.length === 0) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Private Feedback Yet</h3>
          <p className="text-gray-500">
            Private feedback from customers will appear here once they start submitting it.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group feedback by sentiment
  const positiveFeedback = feedback.filter(f => f.sentiment === 'positive');
  const neutralFeedback = feedback.filter(f => f.sentiment === 'neutral');
  const negativeFeedback = feedback.filter(f => f.sentiment === 'negative');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{positiveFeedback.length}</div>
            <div className="text-sm text-gray-500">Positive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{neutralFeedback.length}</div>
            <div className="text-sm text-gray-500">Neutral</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{negativeFeedback.length}</div>
            <div className="text-sm text-gray-500">Negative</div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Private Feedback</h3>
        {feedback.map((feedbackItem) => (
          <PrivateFeedbackCard
            key={feedbackItem.id}
            feedback={feedbackItem}
            onView={handleViewFeedback}
          />
        ))}
      </div>

      {/* Load More Button */}
      {feedback.length >= 50 && (
        <div className="text-center">
          <Button variant="outline" onClick={loadFeedback}>
            Load More Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
