import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  MessageSquare,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  ExternalLink
} from 'lucide-react';

const ReviewAnalytics = ({ reviews = [] }) => {
  const [timeRange, setTimeRange] = useState('30');
  const [competitorData, setCompetitorData] = useState(null);

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date();
    const days = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredReviews = reviews.filter(review => 
      new Date(review.review_created_at) >= cutoffDate
    );

    const totalReviews = filteredReviews.length;
    const respondedReviews = filteredReviews.filter(r => r.status === 'responded' || r.reply_text).length;
    const responseRate = totalReviews > 0 ? (respondedReviews / totalReviews * 100).toFixed(1) : 0;
    
    // Calculate average rating
    const avgRating = totalReviews > 0 
      ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;

    // Calculate response time (mock data for now)
    const avgResponseTime = '2.5 hours';

    // Rating trends
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: filteredReviews.filter(r => r.rating === rating).length,
      percentage: totalReviews > 0 ? (filteredReviews.filter(r => r.rating === rating).length / totalReviews * 100).toFixed(1) : 0
    }));

    // Platform breakdown
    const platformBreakdown = {};
    filteredReviews.forEach(review => {
      platformBreakdown[review.platform] = (platformBreakdown[review.platform] || 0) + 1;
    });

    // Sentiment analysis
    const positiveReviews = filteredReviews.filter(r => r.sentiment === 'positive').length;
    const negativeReviews = filteredReviews.filter(r => r.sentiment === 'negative').length;
    const neutralReviews = filteredReviews.filter(r => r.sentiment === 'neutral').length;
    
    const sentimentScore = totalReviews > 0 
      ? ((positiveReviews / totalReviews) * 100).toFixed(1)
      : 0;

    // Top keywords (mock data for now)
    const topKeywords = [
      { word: 'service', count: 45, sentiment: 'positive' },
      { word: 'price', count: 32, sentiment: 'neutral' },
      { word: 'friendly', count: 28, sentiment: 'positive' },
      { word: 'quality', count: 24, sentiment: 'positive' },
      { word: 'slow', count: 18, sentiment: 'negative' }
    ];

    return {
      totalReviews,
      responseRate,
      avgRating,
      avgResponseTime,
      ratingDistribution,
      platformBreakdown,
      sentimentScore,
      positiveReviews,
      negativeReviews,
      neutralReviews,
      topKeywords
    };
  };

  const metrics = calculateMetrics();

  // Mock competitor data
  useEffect(() => {
    setCompetitorData({
      yourRating: parseFloat(metrics.avgRating),
      competitorRating: 4.2,
      marketPosition: 'above'
    });
  }, [metrics.avgRating]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review Analytics</h2>
        <div className="flex gap-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">{metrics.responseRate}%</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{metrics.avgResponseTime}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">{metrics.avgRating}⭐</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold">{metrics.totalReviews}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitor Benchmark (Pro Feature) */}
      {competitorData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Competitor Benchmark
              <Badge variant="secondary">Pro</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">Your Average Rating</p>
                <p className="text-3xl font-bold text-blue-600">{competitorData.yourRating}⭐</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">vs</p>
                <div className="flex items-center gap-1">
                  {competitorData.marketPosition === 'above' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    competitorData.marketPosition === 'above' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {competitorData.marketPosition === 'above' ? 'Above' : 'Below'} Market
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Local Competitor Average</p>
                <p className="text-3xl font-bold text-gray-600">{competitorData.competitorRating}⭐</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{count} reviews</span>
                      <span className="text-gray-500">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{metrics.sentimentScore}%</p>
                <p className="text-sm text-gray-600">Positive Sentiment</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">{metrics.positiveReviews}</p>
                  <p className="text-xs text-gray-600">Positive</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-600">{metrics.neutralReviews}</p>
                  <p className="text-xs text-gray-600">Neutral</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{metrics.negativeReviews}</p>
                  <p className="text-xs text-gray-600">Negative</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Top Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.topKeywords.map((keyword, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={keyword.sentiment === 'positive' ? 'default' : 
                           keyword.sentiment === 'negative' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {keyword.word}
                  </Badge>
                  <span className="text-sm text-gray-600">{keyword.count} mentions</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.platformBreakdown).map(([platform, count]) => (
              <div key={platform} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-gray-600 capitalize">{platform}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewAnalytics;
