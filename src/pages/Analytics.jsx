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
      <div className="mb-8 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('ai-insights')}
            className={`flex items-center gap-2 text-sm font-medium pb-3 border-b-2 transition-colors ${
              activeTab === 'ai-insights' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            AI Insights
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 text-sm font-medium pb-3 border-b-2 transition-colors ${
              activeTab === 'performance' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Performance
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 text-sm font-medium pb-3 border-b-2 transition-colors ${
              activeTab === 'trends' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
            </svg>
            Trends
          </button>
          <button
            onClick={() => setActiveTab('competitors')}
            className={`flex items-center gap-2 text-sm font-medium pb-3 border-b-2 transition-colors ${
              activeTab === 'competitors' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
            </svg>
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
