import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ReviewsInbox from '../components/reviews/ReviewsInbox';
import ReviewConnectionModal from '../components/reviews/ReviewConnectionModal';
import ReviewAnalytics from '../components/reviews/ReviewAnalytics';
import GoogleOAuthConnection from '../components/reviews/GoogleOAuthConnection';
import { Plus, BarChart3, FileText, Settings } from 'lucide-react';

const Reviews = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [showPlatformConnector, setShowPlatformConnector] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('=== MODAL STATE CHANGED ===');
    console.log('showPlatformConnector:', showPlatformConnector);
  }, [showPlatformConnector]);

  // Debug component rendering
  useEffect(() => {
    console.log('=== REVIEWS COMPONENT RENDERED ===');
    console.log('showPlatformConnector state:', showPlatformConnector);
  }, []);

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
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Connect Review Platforms
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Modal for connecting platforms */}
        <ReviewConnectionModal 
          isOpen={showPlatformConnector}
          onClose={() => {
            console.log('=== MODAL CLOSED ===');
            setShowPlatformConnector(false);
          }}
          onConnectionSuccess={() => {
            console.log('=== REVIEWS PAGE CONNECTION SUCCESS ===');
            setShowPlatformConnector(false);
            // Refresh the inbox to show new reviews
            console.log('Reloading page to show new reviews...');
            window.location.reload();
          }}
        />
        
        {!showPlatformConnector && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-6">
              <TabsList>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inbox" className="flex-1 mt-0 p-6">
              <ReviewsInbox onReviewsChange={setReviews} />
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 mt-0 p-6">
              <ReviewAnalytics reviews={reviews} />
            </TabsContent>


            <TabsContent value="settings" className="flex-1 mt-0 p-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Review Platform Connections</CardTitle>
                    <CardDescription>
                      Connect your review platforms to enable direct reply functionality
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GoogleOAuthConnection 
                      onConnectionChange={setIsGoogleConnected}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Reviews;