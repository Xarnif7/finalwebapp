
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  MessageSquare, 
  Send, 
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/components/lib/utils";
import PageHeader from "@/components/ui/PageHeader";

// FIX: Buttons and dropdowns are now visible and styled correctly.

const mockReviews = [
  {
    id: "1",
    customer_name: "Sarah Johnson",
    review_content: "Amazing service! The staff was incredibly helpful and the quality exceeded my expectations. Will definitely be back!",
    review_rating: 5,
    platform: "google",
    status: "draft",
    created_date: "2024-01-15T10:30:00Z",
    sentiment: 'positive',
  },
  {
    id: "2", 
    customer_name: "Mike Chen",
    review_content: "Good service overall, but the wait time was longer than expected. The final result was worth it though.",
    review_rating: 4,
    platform: "yelp",
    status: "sent",
    final_reply: "Thank you for your feedback, Mike! We're glad you were happy with the result and we'll work on improving our wait times.",
    created_date: "2024-01-14T15:45:00Z",
    sentiment: 'positive',
  },
  {
    id: "3",
    customer_name: "Emily Rodriguez", 
    review_content: "Disappointing experience. The service didn't meet my expectations and the staff seemed rushed.",
    review_rating: 2,
    platform: "facebook",
    status: "draft",
    created_date: "2024-01-13T09:20:00Z",
    sentiment: 'negative',
  }
];

const mockAiReplies = {
  positive: {
    professional: "Thank you for your positive feedback. We are pleased to hear you had a great experience and look forward to serving you again.",
    friendly: "Wow, thanks so much for the amazing review! We're so happy you had a great time and can't wait to see you again soon! 😊",
    grateful: "We are incredibly grateful for your kind words. Reviews like yours make our day and motivate us to continue delivering the best service.",
  },
  negative: {
    professional: "We sincerely apologize that your experience did not meet expectations. We value your feedback and would appreciate the opportunity to discuss this further with you.",
    friendly: "Oh no, we're really sorry we let you down. Your feedback is super important for us to improve. We'd love to chat more about how we can do better.",
    apologetic: "We are so sorry to hear about your experience. This is not the standard we aim for, and we would like to make things right. Please contact us at your convenience.",
  }
};


const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}/>)}
    </div>
);

const platformColors = {
  google: "bg-white text-purple-600 border-purple-200 hover:bg-purple-50 transition-colors",
  yelp: "bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors", 
  facebook: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
};

export default function ReviewInboxPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [selectedReview, setSelectedReview] = useState(reviews[0]);
  const [editingReply, setEditingReply] = useState("");
  const [replyTone, setReplyTone] = useState("professional");
  
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (selectedReview) {
      generateReply(replyTone, selectedReview.review_rating);
    }
  }, [replyTone, selectedReview]);

  const generateReply = (tone, rating) => {
    const sentiment = rating >= 4 ? 'positive' : 'negative';
    const newDraft = mockAiReplies[sentiment]?.[tone] || "Could not generate a reply for this tone.";
    setEditingReply(newDraft);
    checkIfDuplicate(newDraft);
  };
  
  const handleSelectReview = (review) => {
    setSelectedReview(review);
    setReplyTone("professional");
  };
  
  const approveAndSendReply = (reviewId) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: "sent", final_reply: editingReply } : r));
    // In a real app, you would show a success toast here
    // For now, just clearing selection
    const nextReview = reviews.find(r => r.id !== reviewId && r.status === 'draft');
    setSelectedReview(nextReview || null);
    setEditingReply("");
  };

  const checkIfDuplicate = (newText) => {
    const lastReply = reviews.find(r => r.status === 'sent')?.final_reply;
    if (lastReply && newText.includes(lastReply.substring(0, 30))) { // Simple similarity check
      setIsDuplicate(true);
    } else {
      setIsDuplicate(false);
    }
  };

  const filteredReviews = reviews.filter(r => {
      const platformMatch = platformFilter === 'all' || r.platform === platformFilter;
      const sentimentMatch = sentimentFilter === 'all' || r.sentiment === sentimentFilter;
      return platformMatch && sentimentMatch;
  });

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Review Inbox" 
        subtitle="Manage and respond to customer reviews with AI assistance"
      />
      
      <div className="flex gap-4">
        <Select value={platformFilter} onValueChange={setPlatformFilter}><SelectTrigger className="w-48 bg-white"><SelectValue placeholder="All Platforms" /></SelectTrigger><SelectContent><SelectItem value="all">All Platforms</SelectItem><SelectItem value="google">Google</SelectItem><SelectItem value="yelp">Yelp</SelectItem><SelectItem value="facebook">Facebook</SelectItem></SelectContent></Select>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}><SelectTrigger className="w-48 bg-white"><SelectValue placeholder="All Sentiments" /></SelectTrigger><SelectContent><SelectItem value="all">All Sentiments</SelectItem><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 rounded-2xl">
            <CardHeader><CardTitle>Recent Reviews ({filteredReviews.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 h-[600px] overflow-y-auto">
                {filteredReviews.map((review) => (
                  <motion.div key={review.id} whileHover={{ backgroundColor: "var(--accent)" }}
                    className={`p-4 cursor-pointer border-l-4 ${selectedReview?.id === review.id ? "border-blue-500 bg-blue-50" : "border-transparent hover:border-gray-200"}`}
                    onClick={() => handleSelectReview(review)}
                  >
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <p className="font-medium text-sm">{review.customer_name}</p>
                            <StarRating rating={review.review_rating} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={cn("capitalize", platformColors[review.platform])}>{review.platform}</Badge>
                            {review.status === "sent" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.review_content}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedReview ? (
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{selectedReview.customer_name}<StarRating rating={selectedReview.review_rating} /></CardTitle>
                    <Badge className={cn("capitalize mt-2", platformColors[selectedReview.platform])}>{selectedReview.platform}</Badge>
                  </div>
                  {selectedReview.review_rating >= 4 ? <ThumbsUp className="w-5 h-5 text-green-500" /> : <ThumbsDown className="w-5 h-5 text-red-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Customer Review</h4>
                  <div className="bg-slate-50 p-4 rounded-lg"><p className="text-gray-700">{selectedReview.review_content}</p></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Your Reply</h4>
                    <div className="flex items-center gap-2">
                      <Select value={replyTone} onValueChange={setReplyTone}>
                        <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          {selectedReview.review_rating < 4 && <SelectItem value="apologetic">Apologetic</SelectItem>}
                          {selectedReview.review_rating >= 4 && <SelectItem value="grateful">Grateful</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => generateReply(replyTone, selectedReview.review_rating)}><Sparkles className="w-4 h-4 mr-2" />AI Assist</Button>
                    </div>
                  </div>
                  {isDuplicate && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-md mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        This reply is similar to a previous one. 
                        <Button variant="link" className="p-0 h-auto" onClick={() => generateReply(replyTone, selectedReview.review_rating)}>Generate variation</Button>
                    </div>
                  )}
                  <Textarea rows={6} value={editingReply} onChange={(e) => setEditingReply(e.target.value)} placeholder="Write your reply..." className="mb-4"/>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{editingReply.length} characters</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSelectedReview(null)}>Cancel</Button>
                      <Button onClick={() => approveAndSendReply(selectedReview.id)} disabled={!editingReply.trim()}><Send className="w-4 h-4 mr-2" />Send Reply</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="flex items-center justify-center h-[600px]"><div className="text-center text-gray-500"><MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>Select a review to compose a reply</p></div></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
