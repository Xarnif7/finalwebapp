import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Star, MessageSquare, Clock, User, Filter, Search, QrCode, Mail, CheckCircle, X, Trash2, Smartphone } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function PrivateFeedbackInbox() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageOffset, setPageOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 8;
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailComposerData, setEmailComposerData] = useState(null);
  const [showSMSComposer, setShowSMSComposer] = useState(false);
  const [smsComposerData, setSmsComposerData] = useState(null);

  useEffect(() => {
    fetchPrivateFeedback(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll: observe sentinel
  useEffect(() => {
    const sentinel = document.getElementById('feedback-infinite-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && hasMore && !loading) {
          fetchPrivateFeedback(false);
        }
      });
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, pageOffset]);

  const fetchPrivateFeedback = async (reset = false) => {
    try {
      setLoading(true);
      
      // Get user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Fetch private feedback for the user's business
      const response = await fetch(`/api/private-feedback?limit=${PAGE_SIZE}&offset=${reset ? 0 : pageOffset}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch private feedback');
      }

      const data = await response.json();
      const fetched = data.feedback || [];
      console.log('🔍 Raw feedback data:', fetched);
      
      // Transform the nested data structure
      const transformedFeedback = fetched.map(item => {
        // Handle both review_request feedback and direct business feedback (QR codes)
        const customerData = item.review_requests?.customers;
        const customerName = customerData ? 
          (customerData.full_name || 
           `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || 
           'Unknown Customer') : 
          (item.customer_name || 'Unknown Customer');
        
        const customerEmail = customerData?.email || item.customer_email || '';
        
        console.log('🔍 Customer data for item:', {
          itemId: item.id,
          source: item.source,
          customerData,
          customerName,
          customerEmail,
          hasReviewRequest: !!item.review_requests
        });
        
        return {
          ...item,
          customer_name: customerName,
          customer_email: customerEmail
        };
      });
      setFeedback(prev => reset ? transformedFeedback : [...prev, ...transformedFeedback]);
      setPageOffset(prev => reset ? PAGE_SIZE : prev + PAGE_SIZE);
      setHasMore((data.total || 0) > (reset ? PAGE_SIZE : (pageOffset + PAGE_SIZE)));
    } catch (err) {
      console.error('Error fetching private feedback:', err);
      setError('Failed to load private feedback');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800';
      case 'negative': return 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800';
      case 'neutral': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800';
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

  const getSourceInfo = (source) => {
    switch (source) {
      case 'qr_code':
        return {
          label: 'QR Code',
          icon: <QrCode className="w-3 h-3" />,
          color: 'bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800'
        };
      case 'review_request':
      case 'email':
        return {
          label: 'Email',
          icon: <Mail className="w-3 h-3" />,
          color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 hover:text-purple-800'
        };
      default:
        return {
          label: 'Unknown',
          icon: <MessageSquare className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-800 hover:bg-gray-100 hover:text-gray-800'
        };
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

  const handleSendFollowup = (feedback) => {
    setEmailComposerData({
      customerName: feedback.customer_name,
      customerEmail: feedback.customer_email,
      originalMessage: feedback.message,
      rating: feedback.rating,
      sentiment: feedback.sentiment
    });
    setShowEmailComposer(true);
  };

  const handleSendSMS = (feedback) => {
    // Get customer phone from the review_requests relationship
    const customerPhone = feedback.review_requests?.customers?.phone || feedback.customer_phone;
    
    console.log('SMS Debug - Feedback data:', feedback);
    console.log('SMS Debug - Customer phone lookup:', {
      'feedback.review_requests?.customers?.phone': feedback.review_requests?.customers?.phone,
      'feedback.customer_phone': feedback.customer_phone,
      'final phone': customerPhone
    });
    
    if (!customerPhone) {
      alert('No phone number available for this customer');
      return;
    }

    setSmsComposerData({
      customerName: feedback.customer_name,
      customerPhone: customerPhone,
      originalMessage: feedback.message,
      rating: feedback.rating,
      sentiment: feedback.sentiment
    });
    setShowSMSComposer(true);
  };

  const handleMarkResolved = async (feedbackId, resolved) => {
    try {
      // Get user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/private-feedback/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ resolved })
      });

      if (!response.ok) {
        throw new Error('Failed to update feedback');
      }

      // Update the local state
      setFeedback(prev => prev.map(item => 
        item.id === feedbackId ? { ...item, resolved } : item
      ));

      // Update selected feedback if it's the same item
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => ({ ...prev, resolved }));
      }

    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Error updating feedback: ' + error.message);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSentiment = sentimentFilter === 'all' || item.sentiment === sentimentFilter;
    
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'qr_code' && item.source === 'qr_code') ||
      (sourceFilter === 'email' && (item.source === 'review_request' || item.source === 'email'));
    
    return matchesSearch && matchesSentiment && matchesSource;
  });

  // Remove blocking full-screen loader; use inline progress if desired

  if (error) {
    return (
      <Card>
        <CardContent className="px-6 pt-10 pb-8">
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
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-2 sm:mt-0">
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
              
              <div className="flex gap-2">
                <Button
                  variant={sourceFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSourceFilter('all')}
                >
                  All Sources
                </Button>
                <Button
                  variant={sourceFilter === 'qr_code' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSourceFilter('qr_code')}
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  QR Code
                </Button>
                <Button
                  variant={sourceFilter === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSourceFilter('email')}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              </div>
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
              {searchTerm || sentimentFilter !== 'all' || sourceFilter !== 'all'
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
              <CardContent className="px-6 pt-7 pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <Badge className={getSentimentColor(item.sentiment)}>
                        {getSentimentIcon(item.sentiment)} {item.sentiment}
                      </Badge>
                      {(() => {
                        const sourceInfo = getSourceInfo(item.source);
                        return (
                          <Badge className={sourceInfo.color}>
                            {sourceInfo.icon} {sourceInfo.label}
                          </Badge>
                        );
                      })()}
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          {renderStars(item.rating)}
                          <span className="text-sm text-gray-600 ml-1">({item.rating}/5)</span>
                        </div>
                      )}
                    </div>
                    
                    {item.message && (
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {item.message}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(item.created_at)}
                      </div>
                      {item.customer_name && item.customer_name !== 'Unknown Customer' && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span className="font-medium text-gray-700">{item.customer_name}</span>
                          {item.customer_email && (
                            <span className="text-gray-500">({item.customer_email})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center gap-2">
                    {item.resolved && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div className="flex justify-center py-3">
              <div id="feedback-infinite-sentinel" className="h-1 w-24 bg-transparent"></div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Feedback Details
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSelectedFeedback(null)}>Close</Button>
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
                  <Button size="sm" onClick={() => handleSendFollowup(selectedFeedback)}>
                    <Mail className="w-4 h-4 mr-1" />
                    Send Follow-up Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSendSMS(selectedFeedback)}>
                    <Smartphone className="w-4 h-4 mr-1" />
                    Send Follow-up Text
                  </Button>
                  {selectedFeedback.resolved ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMarkResolved(selectedFeedback.id, false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Mark as Unresolved
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMarkResolved(selectedFeedback.id, true)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </div>
              {/* Delete floating action */}
              <div className="absolute bottom-4 right-4">
                <Button variant="destructive" size="icon" onClick={async () => {
                  if (!window.confirm('Are you sure you want to delete this feedback?')) return;
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.access_token) return alert('Not authenticated');
                    const resp = await fetch(`/api/private-feedback/${selectedFeedback.id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    if (!resp.ok) {
                      const e = await resp.json().catch(() => ({}));
                      throw new Error(e.error || 'Failed to delete');
                    }
                    setFeedback(prev => prev.filter(f => f.id !== selectedFeedback.id));
                    setSelectedFeedback(null);
                  } catch (e) {
                    console.error('Delete error', e);
                    alert('Failed to delete feedback: ' + e.message);
                  }
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && emailComposerData && (
        <EmailComposerModal
          data={emailComposerData}
          onClose={() => {
            setShowEmailComposer(false);
            setEmailComposerData(null);
          }}
        />
      )}

      {/* SMS Composer Modal */}
      {showSMSComposer && smsComposerData && (
        <SMSComposerModal
          data={smsComposerData}
          onClose={() => {
            setShowSMSComposer(false);
            setSmsComposerData(null);
          }}
        />
      )}
    </div>
  );
}

// Email Composer Modal Component
function EmailComposerModal({ data, onClose }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Pre-fill subject and message based on sentiment
    if (data.sentiment === 'negative') {
      setSubject(`We're sorry about your experience - Let's make it right`);
      setMessage(`Hi ${data.customerName},

Thank you for taking the time to share your feedback about your recent experience with us. We sincerely apologize that we didn't meet your expectations.

We take all feedback seriously and would like to make this right. Could you please give us a call at [YOUR_PHONE] or reply to this email so we can discuss how we can improve your experience?

We value your business and want to ensure you're completely satisfied.

Best regards,
[YOUR_NAME]
[YOUR_BUSINESS_NAME]`);
    } else {
      setSubject(`Thank you for your feedback!`);
      setMessage(`Hi ${data.customerName},

Thank you for taking the time to share your feedback with us. We're glad to hear about your experience and appreciate your input.

If there's anything else we can do for you, please don't hesitate to reach out.

Best regards,
[YOUR_NAME]
[YOUR_BUSINESS_NAME]`);
    }
  }, [data]);

  const handleSend = async () => {
    setSending(true);
    try {
      // Get user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Authentication required');
        return;
      }

      const response = await fetch('/api/send-followup-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          to: data.customerEmail,
          subject: subject,
          message: message,
          customerName: data.customerName
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send email');

      alert('Follow-up email sent successfully!');
      onClose();
    } catch (err) {
      console.error('Error sending follow-up email:', err);
      alert('Failed to send email: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleMarkResolved = async (feedbackId, resolved) => {
    try {
      // Get user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/private-feedback/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ resolved })
      });

      if (!response.ok) {
        throw new Error('Failed to update feedback');
      }

      // Update the local state
      setFeedback(prev => prev.map(item => 
        item.id === feedbackId ? { ...item, resolved } : item
      ));

      // Update selected feedback if it's the same item
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => ({ ...prev, resolved }));
      }

    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Error updating feedback: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Send Follow-up Email</CardTitle>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Customer Details:</h4>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {data.customerName}<br/>
              <strong>Email:</strong> {data.customerEmail}<br/>
              <strong>Rating:</strong> {data.rating}/5 stars<br/>
              <strong>Original Message:</strong> {data.originalMessage}
            </p>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message to the customer"
              rows={8}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSend} disabled={sending}>
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// SMS Composer Modal Component
function SMSComposerModal({ data, onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Pre-fill message based on sentiment
    if (data.sentiment === 'negative') {
      setMessage(`Hi ${data.customerName},

Thank you for your feedback. We sincerely apologize that we didn't meet your expectations and would like to make this right.

Could you please give us a call at [YOUR_PHONE] or reply to this text so we can discuss how we can improve your experience?

We value your business and want to ensure you're completely satisfied.

Best regards,
[YOUR_NAME]
[YOUR_BUSINESS_NAME]`);
    } else {
      setMessage(`Hi ${data.customerName},

Thank you for taking the time to share your feedback with us. We're glad to hear about your experience and appreciate your input.

If there's anything else we can do for you, please don't hesitate to reach out.

Best regards,
[YOUR_NAME]
[YOUR_BUSINESS_NAME]`);
    }
  }, [data]);

  const handleSend = async () => {
    setSending(true);
    try {
      // Get user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Authentication required');
        return;
      }

      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.business_id) {
        alert('Business not found');
        return;
      }

      const response = await fetch('/api/surge/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          businessId: profile.business_id,
          to: data.customerPhone,
          body: message
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send SMS');

      alert('Follow-up text sent successfully!');
      onClose();
    } catch (err) {
      console.error('Error sending follow-up SMS:', err);
      alert('Failed to send text: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Send Follow-up Text</CardTitle>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Customer Details:</h4>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {data.customerName}<br/>
              <strong>Phone:</strong> {data.customerPhone}<br/>
              <strong>Rating:</strong> {data.rating}/5 stars<br/>
              <strong>Original Message:</strong> {data.originalMessage}
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message to the customer"
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {message.length}/160 (SMS limit)
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send Text'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}