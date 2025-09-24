import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewImporter({ businessId, onReviewAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    rating: 5,
    review_text: '',
    review_url: ''
  });

  const platforms = [
    { value: 'google', label: 'Google Maps', icon: '🔍' },
    { value: 'facebook', label: 'Facebook', icon: '📘' },
    { value: 'yelp', label: 'Yelp', icon: '🔴' },
    { value: 'bbb', label: 'Better Business Bureau', icon: '🏆' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          ...formData,
          review_date: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        onReviewAdded(data.review);
        setFormData({
          platform: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          rating: 5,
          review_text: '',
          review_url: ''
        });
        setIsOpen(false);
      } else {
        console.error('Failed to add review');
      }
    } catch (error) {
      console.error('Error adding review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSampleReviews = async () => {
    setIsLoading(true);
    
    const sampleReviews = [
      {
        platform: 'google',
        customer_name: 'John Smith',
        customer_email: 'john@example.com',
        rating: 5,
        review_text: 'Excellent service! The team was professional, punctual, and did an amazing job. Highly recommend!',
        review_url: 'https://maps.google.com/review123'
      },
      {
        platform: 'facebook',
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah@example.com',
        rating: 4,
        review_text: 'Good work overall. The technician was friendly and knowledgeable. Would use again.',
        review_url: 'https://facebook.com/review456'
      },
      {
        platform: 'yelp',
        customer_name: 'Mike Wilson',
        customer_email: 'mike@example.com',
        rating: 5,
        review_text: 'Outstanding service from start to finish. They went above and beyond my expectations.',
        review_url: 'https://yelp.com/review789'
      },
      {
        platform: 'google',
        customer_name: 'Lisa Brown',
        customer_email: 'lisa@example.com',
        rating: 3,
        review_text: 'Service was okay, but took longer than expected. The final result was satisfactory.',
        review_url: 'https://maps.google.com/review101'
      },
      {
        platform: 'facebook',
        customer_name: 'David Lee',
        customer_email: 'david@example.com',
        rating: 5,
        review_text: 'Fantastic experience! The team was courteous, efficient, and the quality of work was top-notch.',
        review_url: 'https://facebook.com/review202'
      }
    ];

    try {
      for (const review of sampleReviews) {
        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            ...review,
            review_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // Random date within last 30 days
          })
        });
      }
      
      // Refresh the reviews list
      window.location.reload();
    } catch (error) {
      console.error('Error adding sample reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="p-6">
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
            <p className="text-gray-500 text-center mb-6">
              Import reviews from Google, Facebook, Yelp, and other platforms to get started.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setIsOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Review Manually
              </Button>
              <Button variant="outline" onClick={addSampleReviews} disabled={isLoading} className="gap-2">
                <FileText className="w-4 h-4" />
                {isLoading ? 'Adding...' : 'Add Sample Reviews'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform *
                </label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.icon} {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating *
                </label>
                <Select
                  value={formData.rating.toString()}
                  onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {'⭐'.repeat(rating)} {rating} Star{rating !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Phone
                </label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Text *
              </label>
              <Textarea
                value={formData.review_text}
                onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                placeholder="Enter the review text..."
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review URL
              </label>
              <Input
                value={formData.review_url}
                onChange={(e) => setFormData({ ...formData, review_url: e.target.value })}
                placeholder="https://maps.google.com/review123"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
