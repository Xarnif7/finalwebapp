
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Clock, MessageSquare, Filter, Calendar, Download, BarChart3, Eye } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "react-hot-toast";
import { useReviewStats } from "@/hooks/useReviewStats";

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

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch reviews for the time period
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', profile.business_id)
        .gte('review_created_at', startDate.toISOString())
        .order('review_created_at', { ascending: true });

      if (reviewsError) throw reviewsError;

      // Calculate metrics
      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : 0;
      
      const repliedReviews = reviews.filter(r => r.is_replied).length;
      const replyRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

      // Calculate response time (placeholder for now)
      const responseTime = 2.4; // hours

      setMetrics({
        avgRating: parseFloat(avgRating),
        totalReviews,
        responseTime,
        replyRate
      });

      // Calculate platform breakdown
      const platformData = {};
      reviews.forEach(review => {
        if (!platformData[review.platform]) {
          platformData[review.platform] = { count: 0, totalRating: 0 };
        }
        platformData[review.platform].count++;
        platformData[review.platform].totalRating += review.rating;
      });

      const breakdown = Object.entries(platformData).map(([platform, data]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        reviews: data.count,
        rating: (data.totalRating / data.count).toFixed(1),
        color: platformColors[platform.charAt(0).toUpperCase() + platform.slice(1)] || "bg-white text-gray-600 border-gray-200"
      }));

      setPlatformBreakdown(breakdown);

      // Calculate rating trends by week/month
      const trends = calculateRatingTrends(reviews, timeRange);
      setRatingTrends(trends);

    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateRatingTrends = (reviews, timeRange) => {
    if (!reviews.length) return [];

    const days = parseInt(timeRange);
    const intervals = timeRange === '7' ? 7 : timeRange === '30' ? 4 : 12;
    const intervalSize = days / intervals;

    const trends = [];
    for (let i = 0; i < intervals; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - (i * intervalSize)));
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (days - ((i + 1) * intervalSize)));

      const intervalReviews = reviews.filter(review => {
        const reviewDate = new Date(review.review_created_at);
        return reviewDate >= endDate && reviewDate < startDate;
      });

      const avgRating = intervalReviews.length > 0
        ? (intervalReviews.reduce((sum, r) => sum + r.rating, 0) / intervalReviews.length).toFixed(1)
        : 0;

      trends.push({
        period: i === intervals - 1 ? 'Now' : `${Math.round(days - ((i + 1) * intervalSize))}d ago`,
        rating: parseFloat(avgRating),
        count: intervalReviews.length
      });
    }

    return trends.reverse();
  };

  const exportData = async (format) => {
    try {
      if (format === 'csv') {
        // Generate CSV data
        const csvContent = generateCSV();
        downloadFile(csvContent, 'review-performance.csv', 'text/csv');
        toast.success('CSV exported successfully!');
      } else if (format === 'png') {
        // For PNG export, we'd need a chart library
        toast.info('PNG export requires chart library integration');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    }
  };

  const generateCSV = () => {
    const headers = ['Period', 'Average Rating', 'Review Count'];
    const rows = ratingTrends.map(trend => [trend.period, trend.rating, trend.count]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const kpiData = [
    {
      title: "Average Rating",
      value: stats?.avgRating?.toFixed(1) || "0.0",
      subtitle: `Last ${timeRange} days`,
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      gradient: "bg-gradient-to-br from-amber-50/60 to-white"
    },
    {
      title: "Total Reviews",
      value: stats?.totalReviews || 0,
      subtitle: `Last ${timeRange} days`,
      icon: MessageSquare,
      color: "text-green-600",
      bgColor: "bg-green-50",
      gradient: "bg-gradient-to-br from-green-50/60 to-white"
    },
    {
      title: "Response Time",
      value: stats?.avgResponseTimeHours ? `${stats.avgResponseTimeHours}h` : "—",
      subtitle: "Average",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      gradient: "bg-gradient-to-br from-blue-50/60 to-white"
    },
    {
      title: "Reply Rate",
      value: stats?.replyRatePct ? `${stats.replyRatePct}%` : "—",
      subtitle: `Last ${timeRange} days`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      gradient: "bg-gradient-to-br from-purple-50/60 to-white"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-8 space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader 
        title="Review Performance" 
        subtitle="Track ratings, volume, and response trends across platforms"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('png')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Download Chart
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, i) => (
          <Card key={i} className={`${kpi.gradient} ring-1 ring-black/5 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-semibold text-gray-700 mb-1">{kpi.value}</h3>
                <p className="text-sm text-gray-700 font-medium mb-1">{kpi.title}</p>
                <p className="text-xs text-gray-500">{kpi.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Breakdown */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.platformBreakdown?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No platform data available</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {stats?.platformBreakdown?.map((platform, index) => (
                <div key={index} className="text-center p-4 rounded-lg bg-slate-50">
                  <Badge className={`mb-2 ${platformColors[platform.platform] || 'bg-gray-100 text-gray-600'}`}>
                    {platform.platform}
                  </Badge>
                  <div className="text-2xl font-bold text-slate-900">{platform.count}</div>
                  <div className="text-sm text-slate-500 mb-1">Total Reviews</div>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{platform.avgRating}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Trends Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Rating Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.ratingTrends?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No trend data available</p>
            </div>
          ) : (
            <div className="h-64">
              {/* Simple bar chart visualization */}
              <div className="flex items-end justify-between h-48 gap-2">
                {stats?.ratingTrends?.map((trend, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ 
                        height: `${Math.max((trend.avgRating / 5) * 100, 10)}%`,
                        minHeight: '20px'
                      }}
                      title={`${trend.weekStart}: ${trend.avgRating}/5 (${trend.count} reviews)`}
                    ></div>
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      <div className="font-medium">{trend.avgRating}</div>
                      <div className="text-[10px]">{new Date(trend.weekStart).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Chart legend */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Average Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span>Time Period</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReviewPerformance;



