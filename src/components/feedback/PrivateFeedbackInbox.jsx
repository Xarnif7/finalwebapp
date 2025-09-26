import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Star, MessageSquare, Clock, User, Filter, Search } from 'lucide-react';
import { Input } from '../ui/input';

export default function PrivateFeedbackInbox() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    fetchPrivateFeedback();
  }, []);

  const fetchPrivateFeedback = async () => {
    try {
      setLoading(true);
      
      // Get user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Fetch private feedback for the user's business
      const response = await fetch('/api/private-feedback', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch private feedback');
      }

      const data = await response.json();
      // Transform the nested data structure
      const transformedFeedback = (data.feedback || []).map(item => ({
        ...item,
        customer_name: item.review_requests?.customers ? 
          `${item.review_requests.customers.first_name || ''} ${item.review_requests.customers.last_name || ''}`.trim() || 
          'Unknown Customer' : 'Unknown Customer',
        customer_email: item.review_requests?.customers?.email || '',
        business_name: item.review_requests?.businesses?.name || 'Unknown Business'
      }));
      setFeedback(transformedFeedback);
    } catch (err) {
      console.error('Error fetching private feedback:', err);
      setError('Failed to load private feedback');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '❓';
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSentiment = sentimentFilter === 'all' || item.sentiment === sentimentFilter;
    
    return matchesSearch && matchesSentiment;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">Loading private feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={fetchPrivateFeedback} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Private Feedback</h2>
          <p className="text-gray-600">Customer feedback collected privately</p>
        </div>
        <Button onClick={fetchPrivateFeedback} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={sentimentFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('all')}
              >
                All
              </Button>
              <Button
                variant={sentimentFilter === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('positive')}
              >
                😊 Positive
              </Button>
              <Button
                variant={sentimentFilter === 'neutral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('neutral')}
              >
                😐 Neutral
              </Button>
              <Button
                variant={sentimentFilter === 'negative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSentimentFilter('negative')}
              >
                😞 Negative
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Private Feedback Yet</h3>
            <p className="text-gray-600">
              {searchTerm || sentimentFilter !== 'all' 
                ? 'No feedback matches your current filters.'
                : 'Private feedback from customers will appear here when they submit it through your feedback collection forms.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFeedback.map((item) => (
            <Card 
              key={item.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedFeedback?.id === item.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedFeedback(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getSentimentColor(item.sentiment)}>
                        {getSentimentIcon(item.sentiment)} {item.sentiment}
                      </Badge>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          {renderStars(item.rating)}
                          <span className="text-sm text-gray-600 ml-1">({item.rating}/5)</span>
                        </div>
                      )}
                    </div>
                    
                    {item.message && (
                      <p className="text-gray-700 mb-2 line-clamp-2">
                        {item.message}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(item.created_at)}
                      </div>
                      {item.customer_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {item.customer_name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Feedback Details
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className={getSentimentColor(selectedFeedback.sentiment)}>
                  {getSentimentIcon(selectedFeedback.sentiment)} {selectedFeedback.sentiment}
                </Badge>
                {selectedFeedback.rating && (
                  <div className="flex items-center gap-1">
                    {renderStars(selectedFeedback.rating)}
                    <span className="text-sm text-gray-600 ml-1">({selectedFeedback.rating}/5)</span>
                  </div>
                )}
              </div>
              
              {selectedFeedback.message && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Message:</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Submitted:</span>
                  <p className="text-gray-600">{formatDate(selectedFeedback.created_at)}</p>
                </div>
                {selectedFeedback.customer_name && (
                  <div>
                    <span className="font-medium text-gray-900">Customer:</span>
                    <p className="text-gray-600">{selectedFeedback.customer_name}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Response Actions:</h4>
                <div className="flex gap-2">
                  <Button size="sm">
                    Send Follow-up
                  </Button>
                  <Button variant="outline" size="sm">
                    Mark as Resolved
                  </Button>
                  <Button variant="outline" size="sm">
                    Request Public Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}