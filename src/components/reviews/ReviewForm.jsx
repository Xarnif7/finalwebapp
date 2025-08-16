import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

export default function ReviewForm({ isOpen, onClose, onSubmit, clients, reviewRequests }) {
  const [formData, setFormData] = useState({
    client_id: '',
    review_request_id: '',
    platform: 'google',
    rating: 5,
    review_text: '',
    review_url: '',
    verified: true
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      client_id: '',
      review_request_id: '',
      platform: 'google',
      rating: 5,
      review_text: '',
      review_url: '',
      verified: true
    });
  };

  const StarRatingSelector = ({ rating, onChange }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star 
              className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
        <span className="ml-2 font-semibold">{rating} star{rating !== 1 ? 's' : ''}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client *</Label>
            <Select value={formData.client_id} onValueChange={(value) => handleInputChange('client_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_request_id">Review Request (Optional)</Label>
            <Select value={formData.review_request_id} onValueChange={(value) => handleInputChange('review_request_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Link to review request" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No associated request</SelectItem>
                {reviewRequests.map((request) => {
                  const client = clients.find(c => c.id === request.client_id);
                  return (
                    <SelectItem key={request.id} value={request.id}>
                      {client ? `${client.first_name} ${client.last_name}` : 'Unknown'} - {request.sent_date ? new Date(request.sent_date).toLocaleDateString() : 'Scheduled'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="yelp">Yelp</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rating *</Label>
            <StarRatingSelector 
              rating={formData.rating} 
              onChange={(rating) => handleInputChange('rating', rating)} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_text">Review Text</Label>
            <Textarea
              id="review_text"
              value={formData.review_text}
              onChange={(e) => handleInputChange('review_text', e.target.value)}
              placeholder="Copy the review text here..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_url">Review URL</Label>
            <Input
              id="review_url"
              value={formData.review_url}
              onChange={(e) => handleInputChange('review_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Add Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}