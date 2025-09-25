import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star, 
  Clock, 
  User, 
  MapPin, 
  DollarSign,
  MessageSquare,
  Send,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X,
  Sparkles,
  Tag,
  Calendar,
  Phone,
  Mail,
  MoreHorizontal,
  ThumbsUp,
  Eye,
  UserPlus,
  Flag,
  Share,
  Archive,
  RefreshCw,
  Plus
} from 'lucide-react';

const platformConfig = {
  google: { name: 'Google', icon: '🔍', color: 'bg-blue-100 text-blue-800', url: 'https://business.google.com' },
  facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-600', url: 'https://facebook.com' },
  yelp: { name: 'Yelp', icon: '🔴', color: 'bg-red-100 text-red-800', url: 'https://yelp.com' },
  bbb: { name: 'BBB', icon: '🏆', color: 'bg-yellow-100 text-yellow-800', url: 'https://bbb.org' }
};

const statusConfig = {
  unread: { name: 'Unread', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  needs_response: { name: 'Needs Response', color: 'bg-orange-100 text-orange-800', icon: MessageSquare },
  responded: { name: 'Responded', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  resolved: { name: 'Resolved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  edited_since_response: { name: 'Edited Since Response', color: 'bg-purple-100 text-purple-800', icon: Edit }
};

const getTimeAgo = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} weeks ago`;
};

const getSLAStatus = (dueAt, status) => {
  if (!dueAt || status === 'responded' || status === 'resolved') return null;
  
  const due = new Date(dueAt);
  const now = new Date();
  const hoursUntilDue = Math.floor((due - now) / (1000 * 60 * 60));
  
  if (hoursUntilDue < 0) {
    return { status: 'overdue', text: 'Overdue', color: 'text-red-600 bg-red-50' };
  } else if (hoursUntilDue < 2) {
    return { status: 'urgent', text: `${hoursUntilDue} hours left`, color: 'text-orange-600 bg-orange-50' };
  } else {
    return { status: 'normal', text: `${hoursUntilDue} hours left`, color: 'text-gray-600 bg-gray-50' };
  }
};

export default function ReviewDetailPanel({ 
  review, 
  onUpdateReview, 
  onGenerateAIResponse,
  onSaveTemplate,
  onAssign,
  onTag,
  onEscalate 
}) {
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [responseText, setResponseText] = useState(review?.reply_text || '');
  const [aiDraft, setAiDraft] = useState(review?.ai_draft || '');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    if (review) {
      setResponseText(review.reply_text || '');
      setAiDraft(review.ai_draft || '');
      fetchTemplates();
    }
  }, [review]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchTemplates = async () => {
    if (!review?.business_id) return;
    
    try {
      const response = await fetch(`/api/reviews/templates?business_id=${review.business_id}&platform=${review.platform}&sentiment=${review.sentiment}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleGenerateAIResponse = async () => {
    if (!review) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_text: review.review_text,
          rating: review.rating,
          platform: review.platform,
          business_name: 'Your Business', // TODO: Get from business data
          job_type: review.job_type,
          sentiment: review.sentiment,
          template_id: selectedTemplate || undefined
        })
      });
      
      const data = await response.json();
      if (data.response) {
        setAiDraft(data.response);
        setResponseText(data.response);
        setIsEditingResponse(true);
        
        // Save the AI draft to the review (only save ai_draft, not other fields)
        try {
          await onUpdateReview(review.id, { ai_draft: data.response });
        } catch (updateError) {
          console.error('Error saving AI draft:', updateError);
          // Don't fail the whole operation if saving fails
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePostReply = async () => {
    if (!review || !responseText.trim()) return;
    
    setIsPostingReply(true);
    try {
      const response = await fetch('/api/reviews/post-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: review.id,
          reply_text: responseText,
          platform: review.platform
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Update the review with the posted reply
        await onUpdateReview(review.id, { 
          reply_text: responseText,
          status: 'responded',
          reply_posted_at: new Date().toISOString()
        });
        
        setIsEditingResponse(false);
        alert('Reply posted successfully!');
      } else {
        alert(`Failed to post reply: ${data.error}`);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleSaveResponse = async () => {
    if (!review || !responseText.trim()) return;
    
    try {
      await onUpdateReview(review.id, {
        reply_text: responseText,
        ai_draft: aiDraft,
        status: 'responded'
      });
      setIsEditingResponse(false);
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(responseText);
  };

  const handleExternalReply = () => {
    const platform = platformConfig[review.platform];
    if (platform?.url && review.review_url) {
      window.open(review.review_url, '_blank');
    }
  };

  const handleAssign = async (userId) => {
    if (!review) return;
    
    try {
      await onUpdateReview(review.id, { assigned_to: userId });
    } catch (error) {
      console.error('Error assigning review:', error);
    }
  };

  const handleAddTag = async () => {
    if (!review || !newTag.trim()) return;
    
    try {
      const currentTags = review.tags || [];
      const updatedTags = [...currentTags, newTag.trim()];
      await onUpdateReview(review.id, { tags: updatedTags });
      setNewTag('');
      setIsAddingTag(false);
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    if (!review) return;
    
    try {
      const currentTags = review.tags || [];
      const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
      await onUpdateReview(review.id, { tags: updatedTags });
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleMarkResolved = async () => {
    if (!review) return;
    
    try {
      await onUpdateReview(review.id, { status: 'resolved' });
    } catch (error) {
      console.error('Error marking as resolved:', error);
    }
  };

  const handleEscalateToFeedback = async () => {
    if (!review) return;
    
    try {
      await onUpdateReview(review.id, { 
        status: 'escalated',
        is_private_feedback: true 
      });
      if (onEscalate) {
        onEscalate(review);
      }
    } catch (error) {
      console.error('Error escalating review:', error);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!review || !responseText.trim()) return;
    
    try {
      const templateData = {
        name: `Response for ${review.platform} ${review.rating}-star review`,
        template_text: responseText,
        platform: review.platform,
        sentiment: review.sentiment,
        job_type: review.job_type,
        business_id: review.business_id
      };
      
      if (onSaveTemplate) {
        await onSaveTemplate(templateData);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleShare = () => {
    if (review?.review_url) {
      navigator.clipboard.writeText(review.review_url);
    }
  };

  if (!review) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a review</h3>
            <p className="text-gray-500">
              Choose a review from the list to view details and respond.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const platform = platformConfig[review.platform] || { name: review.platform, icon: '📱', color: 'bg-gray-100 text-gray-800' };
  const status = statusConfig[review.status] || { name: review.status, color: 'bg-gray-100 text-gray-800', icon: MessageSquare };
  const slaStatus = getSLAStatus(review.due_at, review.status);
  const StatusIcon = status.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${platform.color}`}>
                {platform.icon} {platform.name}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                    } fill-current`}
                  />
                ))}
              </div>
              <Badge variant="secondary" className={`${status.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {slaStatus && (
                <Badge variant="outline" className={`${slaStatus.color}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  {slaStatus.text}
                </Badge>
              )}
              <div className="relative" ref={actionsMenuRef}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
                
                {showActionsMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          handleAssign('me'); // TODO: Get current user ID
                          setShowActionsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to Me
                      </button>
                      <button
                        onClick={() => {
                          handleMarkResolved();
                          setShowActionsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => {
                          handleEscalateToFeedback();
                          setShowActionsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Flag className="w-4 h-4" />
                        Escalate to Feedback
                      </button>
                      <button
                        onClick={() => {
                          handleShare();
                          setShowActionsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Share className="w-4 h-4" />
                        Share Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Reviewer Info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <span className="font-semibold">{review.reviewer_name}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              {getTimeAgo(review.review_created_at)}
            </div>
            {review.reviewer_email && (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Mail className="w-4 h-4" />
                {review.reviewer_email}
              </div>
            )}
            {review.reviewer_phone && (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Phone className="w-4 h-4" />
                {review.reviewer_phone}
              </div>
            )}
          </div>

          {/* Job Context */}
          {review.job_type && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Tag className="w-4 h-4" />
                <span className="font-medium">Job Context</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Service:</span> {review.job_type}
                </div>
                {review.job_amount && (
                  <div>
                    <span className="text-gray-500">Amount:</span> ${review.job_amount}
                  </div>
                )}
                {review.job_location && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Location:</span> {review.job_location}
                  </div>
                )}
                {review.job_notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Notes:</span> {review.job_notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Text */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Review Text</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
            </div>
          </div>

            
            <div className="flex flex-wrap gap-2">
              {review.tags?.map((tag, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer group">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {review.topics?.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Section */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Response</span>
            <div className="flex items-center gap-2">
              {!isEditingResponse && responseText && (
                <Button variant="outline" size="sm" onClick={handleCopyResponse}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExternalReply}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Reply on Platform
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {!isEditingResponse && !responseText && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No response yet</h3>
                <p className="text-gray-500 mb-4">
                  Generate an AI response or write your own reply.
                </p>
                <Button onClick={handleGenerateAIResponse} disabled={isGeneratingAI}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGeneratingAI ? 'Generating...' : 'Generate AI Response'}
                </Button>
              </div>
            </div>
          )}

          {isEditingResponse && (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Template Selection */}
              {templates.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Use Template
                  </label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* AI Draft */}
              {aiDraft && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    AI Draft
                  </label>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                    {aiDraft}
                  </div>
                </div>
              )}

              {/* Response Editor */}
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Your Response
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to this review..."
                  className="flex-1 min-h-[200px]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleSaveResponse}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Response
                </Button>
                <Button 
                  variant="default" 
                  onClick={handlePostReply} 
                  disabled={isPostingReply}
                >
                  {isPostingReply ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Reply
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleSaveAsTemplate}>
                  <Archive className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button variant="outline" onClick={() => setIsEditingResponse(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleGenerateAIResponse} disabled={isGeneratingAI}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate AI
                </Button>
              </div>
            </div>
          )}

          {!isEditingResponse && responseText && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">{responseText}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => setIsEditingResponse(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Response
                </Button>
                <Button 
                  variant="default" 
                  onClick={handlePostReply} 
                  disabled={isPostingReply}
                >
                  {isPostingReply ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Reply
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleExternalReply}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Reply on Platform
                </Button>
              </div>
            </div>
          )}

          {!responseText && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsEditingResponse(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Write Response
              </Button>
              <Button variant="outline" onClick={handleGenerateAIResponse} disabled={isGeneratingAI}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGeneratingAI ? 'Generating...' : 'Generate AI Response'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
