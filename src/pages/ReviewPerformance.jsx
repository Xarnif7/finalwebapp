
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Clock, MessageSquare, Filter, Calendar, Download, BarChart3, Eye, MapPin, Facebook } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase/browser";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "react-hot-toast";
import { useReviewStats } from "@/hooks/useReviewStats";
import { Label } from "@/components/ui/label";

const platformColors = {
  Google: "bg-white text-purple-600 border-purple-200 hover:bg-purple-50 transition-colors",
  Yelp: "bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors", 
  Facebook: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
};

const ReviewPerformance = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30");
  const [businessId, setBusinessId] = useState(null);

  // Get business ID when user loads
  useEffect(() => {
    const getBusinessId = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.business_id) {
          setBusinessId(profile.business_id);
        }
      }
    };
    
    getBusinessId();
  }, [user]);

  // Use the custom hook for stats
  const { data: stats, loading, error, refresh } = useReviewStats({
    businessId,
    windowDays: parseInt(timeRange)
  });

  const exportCSV = () => {
    if (!stats?.ratingTrends?.length) {
      toast.error('No data available to export');
      return;
    }

    const csvContent = [
      ['Week Start', 'Average Rating', 'Review Count'],
      ...stats.ratingTrends.map(trend => [
        new Date(trend.weekStart).toLocaleDateString(),
        trend.avgRating.toFixed(1),
        trend.count
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-trends-${timeRange}days.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
  };

  const downloadChart = () => {
    // Placeholder for chart download functionality
    toast.info('Chart download functionality will be implemented soon!');
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'google': return <MapPin className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'yelp': return <Star className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'google': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'facebook': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'yelp': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <BarChart3 className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Performance"
        subtitle="Track your review performance across all platforms"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!stats?.ratingTrends?.length}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={downloadChart} disabled={!stats?.ratingTrends?.length}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Download Chart
            </Button>
          </div>
        }
      />

      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Time Range:</Label>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.avgRating ? stats.avgRating.toFixed(1) : '0.0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of 5.0</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.totalReviews || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">all time</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Response Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.replyRatePct ? `${stats.replyRatePct}%` : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-1">replied to</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.avgResponseTimeHours ? `${stats.avgResponseTimeHours}h` : '0h'}
                </p>
                <p className="text-xs text-gray-500 mt-1">to reply</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Platform Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.platformBreakdown && Object.keys(stats.platformBreakdown).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.platformBreakdown).map(([platform, data]) => (
                <Card key={platform} className={`border-2 ${getPlatformColor(platform)} hover:shadow-md transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {getPlatformIcon(platform)}
                      <h3 className="font-semibold capitalize">{platform}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Reviews:</span>
                        <span className="font-semibold">{data.totalReviews}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Rating:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{data.avgRating.toFixed(1)}</span>
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Response Rate:</span>
                        <span className="font-semibold">{data.replyRatePct}%</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => window.location.href = `/review-inbox?platform=${platform.toLowerCase()}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View in Inbox
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No platform data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Rating Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.ratingTrends && stats.ratingTrends.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Average rating and review count over time
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
              
              {/* Simple Bar Chart */}
              <div className="h-64 flex items-end justify-between gap-2 p-4 bg-gray-50 rounded-lg">
                {stats.ratingTrends.map((trend, index) => {
                  const maxCount = Math.max(...stats.ratingTrends.map(t => t.count));
                  const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}>
                        <div className="text-xs text-white text-center p-1">
                          {trend.count}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        <div className="font-medium">{trend.avgRating.toFixed(1)}</div>
                        <div className="text-xs">
                          {new Date(trend.weekStart).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Review Count</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>Average Rating</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No trend data available for the selected time range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentReviews && stats.recentReviews.length > 0 ? (
            <div className="space-y-3">
              {stats.recentReviews.slice(0, 5).map((review) => (
                <div key={review.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(review.platform)}
                    <div>
                      <p className="font-medium text-sm">{review.author_name}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <Badge variant={review.responded ? "default" : "secondary"}>
                      {review.responded ? "Replied" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewPerformance;



