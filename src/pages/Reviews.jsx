import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ReviewsInbox from '../components/reviews/ReviewsInbox';
import ReviewConnectionModal from '../components/reviews/ReviewConnectionModal';
import ReviewAnalytics from '../components/reviews/ReviewAnalytics';
import { Plus, BarChart3, FileText } from 'lucide-react';

const Reviews = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [showPlatformConnector, setShowPlatformConnector] = useState(false);
  const [reviews, setReviews] = useState([]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-gray-600 mt-1">
              Manage and respond to customer reviews from all platforms
            </p>
          </div>
          <Button 
            onClick={() => setShowPlatformConnector(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Review Platforms
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Modal for connecting platforms */}
        <ReviewConnectionModal 
          isOpen={showPlatformConnector}
          onClose={() => setShowPlatformConnector(false)}
          onConnectionSuccess={() => {
            setShowPlatformConnector(false);
            // Refresh the inbox to show new reviews
            window.location.reload();
          }}
        />
        
        {!showPlatformConnector && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-6">
              <TabsList>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inbox" className="flex-1 mt-0 p-6">
              <ReviewsInbox onReviewsChange={setReviews} />
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 mt-0 p-6">
              <ReviewAnalytics reviews={reviews} />
            </TabsContent>

            <TabsContent value="templates" className="flex-1 mt-0 p-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Response Templates
                  </CardTitle>
                  <CardDescription>
                    Create and manage response templates for different scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Templates Coming Soon</h3>
                    <p className="text-gray-500">
                      Save successful responses as reusable templates
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Reviews;