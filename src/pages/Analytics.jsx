import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import AIReviewSummaries from '../components/analytics/AIReviewSummaries';
import RevenueImpactTracking from '../components/analytics/RevenueImpactTracking';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('ai-insights');

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">
          AI-powered insights and revenue tracking for your review management
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'ai-insights' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'performance' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'trends' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab('competitors')}
            className={`text-sm font-medium pb-2 ${
              activeTab === 'competitors' 
                ? 'text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Competitors
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {activeTab === 'ai-insights' && (
          <div className="space-y-6">
            <AIReviewSummaries />
            <RevenueImpactTracking />
          </div>
        )}

        {activeTab === 'performance' && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Performance metrics coming soon...</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'trends' && (
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Trend analysis coming soon...</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'competitors' && (
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Competitor analysis coming soon...</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Feature Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Why These Analytics Matter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">
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
              <h3 className="font-semibold text-lg mb-3">
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
