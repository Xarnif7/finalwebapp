import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Brain, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import AIReviewSummaries from '../components/analytics/AIReviewSummaries';
import RevenueImpactTracking from '../components/analytics/RevenueImpactTracking';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('ai-summaries');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">
            AI-powered insights and revenue tracking for your review management
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI-Powered
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Revenue Tracking
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Analysis</p>
                <p className="text-2xl font-bold text-blue-600">Active</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Tracking</p>
                <p className="text-2xl font-bold text-green-600">Enabled</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Insights</p>
                <p className="text-2xl font-bold text-purple-600">Real-time</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ROI Tracking</p>
                <p className="text-2xl font-bold text-orange-600">Live</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-summaries" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Review Summaries
          </TabsTrigger>
          <TabsTrigger value="revenue-impact" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-summaries" className="space-y-6">
          <AIReviewSummaries />
        </TabsContent>

        <TabsContent value="revenue-impact" className="space-y-6">
          <RevenueImpactTracking />
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Why These Analytics Matter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                AI Review Summaries
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Get instant insights from your customer feedback</li>
                <li>• Identify trends and patterns automatically</li>
                <li>• Receive actionable recommendations</li>
                <li>• Track sentiment changes over time</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Revenue Impact Tracking
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• See the direct revenue impact of your reviews</li>
                <li>• Track ROI of your review management efforts</li>
                <li>• Identify your most valuable customer feedback</li>
                <li>• Optimize your review request campaigns</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
