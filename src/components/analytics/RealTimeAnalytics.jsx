import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Star, 
  Zap, 
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  Calendar,
  Target,
  Activity,
  Eye,
  Mail,
  Smartphone,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  BarChart,
  PieChart
} from 'lucide-react';
import { 
  RatingTrendChart, 
  ReviewVolumeChart, 
  PlatformPerformanceChart, 
  SentimentDistributionChart, 
  RatingDistributionChart,
  AutomationPerformanceChart,
  MessageDeliveryChart,
  ChannelPerformanceChart
} from './Charts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { motion } from 'framer-motion';

const RealTimeAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [businessId, setBusinessId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      getBusinessId();
    }
  }, [user?.id]);

  useEffect(() => {
    if (businessId) {
      fetchRealData();
    }
  }, [businessId, timeRange]);

  const getBusinessId = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        setBusinessId(profile.business_id);
      }
    } catch (error) {
      console.error('Error getting business ID:', error);
      setError('Failed to load business data');
    }
  };

  const fetchRealData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[REAL_ANALYTICS] Fetching real data for businessId:', businessId);

      // Calculate date range
      const now = new Date();
      const days = parseInt(timeRange);
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [reviewsData, customersData, automationsData, messagesData] = await Promise.all([
        fetchReviewsData(businessId, startDate),
        fetchCustomersData(businessId, startDate),
        fetchAutomationsData(businessId, startDate),
        fetchMessagesData(businessId, startDate)
      ]);

      // Calculate insights
      const insights = generateInsights(reviewsData, customersData, automationsData, messagesData);
      
      // Calculate KPIs
      const kpis = calculateKPIs(reviewsData, customersData, automationsData, messagesData);
      
      // Calculate trends
      const trends = calculateTrends(reviewsData, customersData, automationsData, messagesData, days);

      setAnalyticsData({
        kpis,
        trends,
        insights,
        reviews: reviewsData,
        customers: customersData,
        automations: automationsData,
        messages: messagesData,
        timeRange: days,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('[REAL_ANALYTICS] Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewsData = async (businessId, startDate) => {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .gte('review_created_at', startDate.toISOString())
        .order('review_created_at', { ascending: false });

      if (error) throw error;

      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;
      
      const respondedCount = reviews.filter(r => r.status === 'responded' || r.reply_text).length;
      const responseRate = totalReviews > 0 ? (respondedCount / totalReviews) * 100 : 0;

      // Sentiment analysis
      const sentimentCounts = reviews.reduce((acc, review) => {
        const sentiment = review.sentiment || 'neutral';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {});

      // Platform breakdown
      const platformCounts = reviews.reduce((acc, review) => {
        acc[review.platform] = (acc[review.platform] || 0) + 1;
        return acc;
      }, {});

      // Rating distribution
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: reviews.filter(r => r.rating === rating).length
      }));

      // Recent reviews for trends
      const recentReviews = reviews.slice(0, 10);

      return {
        totalReviews,
        avgRating: parseFloat(avgRating.toFixed(1)),
        responseRate: parseFloat(responseRate.toFixed(1)),
        sentimentCounts,
        platformCounts,
        ratingDistribution,
        recentReviews,
        reviews
      };
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return {
        totalReviews: 0,
        avgRating: 0,
        responseRate: 0,
        sentimentCounts: {},
        platformCounts: {},
        ratingDistribution: [],
        recentReviews: [],
        reviews: []
      };
    }
  };

  const fetchCustomersData = async (businessId, startDate) => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalCustomers = customers.length;
      const newCustomers = customers.length;

      // Get customers with reviews
      const { data: customersWithReviews } = await supabase
        .from('reviews')
        .select('customer_id')
        .eq('business_id', businessId)
        .gte('review_created_at', startDate.toISOString())
        .not('customer_id', 'is', null);

      const engagedCustomers = new Set(customersWithReviews?.map(r => r.customer_id) || []).size;
      const engagementRate = totalCustomers > 0 ? (engagedCustomers / totalCustomers) * 100 : 0;

      return {
        totalCustomers,
        newCustomers,
        engagedCustomers,
        engagementRate: parseFloat(engagementRate.toFixed(1)),
        customers
      };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
        engagedCustomers: 0,
        engagementRate: 0,
        customers: []
      };
    }
  };

  const fetchAutomationsData = async (businessId, startDate) => {
    try {
      const { data: logs, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalExecutions = logs.length;
      const successfulExecutions = logs.filter(l => l.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      // Execution by source
      const sourceCounts = logs.reduce((acc, log) => {
        acc[log.source] = (acc[log.source] || 0) + 1;
        return acc;
      }, {});

      // Error analysis
      const errorLogs = logs.filter(l => l.status === 'failed');
      const errorRate = totalExecutions > 0 ? (errorLogs.length / totalExecutions) * 100 : 0;

      return {
        totalExecutions,
        successfulExecutions,
        successRate: parseFloat(successRate.toFixed(1)),
        errorRate: parseFloat(errorRate.toFixed(1)),
        sourceCounts,
        errorLogs,
        logs
      };
    } catch (error) {
      console.error('Error fetching automations:', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        successRate: 0,
        errorRate: 0,
        sourceCounts: {},
        errorLogs: [],
        logs: []
      };
    }
  };

  const fetchMessagesData = async (businessId, startDate) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalMessages = messages.length;
      const deliveredMessages = messages.filter(m => m.status === 'delivered').length;
      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      // Channel breakdown
      const channelCounts = messages.reduce((acc, message) => {
        acc[message.channel] = (acc[message.channel] || 0) + 1;
        return acc;
      }, {});

      // Status breakdown
      const statusCounts = messages.reduce((acc, message) => {
        acc[message.status] = (acc[message.status] || 0) + 1;
        return acc;
      }, {});

      return {
        totalMessages,
        deliveredMessages,
        deliveryRate: parseFloat(deliveryRate.toFixed(1)),
        channelCounts,
        statusCounts,
        messages
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        totalMessages: 0,
        deliveredMessages: 0,
        deliveryRate: 0,
        channelCounts: {},
        statusCounts: {},
        messages: []
      };
    }
  };

  const generateInsights = (reviews, customers, automations, messages) => {
    const insights = [];

    // Review insights
    if (reviews.avgRating < 4.0) {
      insights.push({
        type: 'warning',
        category: 'Reviews',
        title: 'Rating Below Industry Average',
        description: `Your average rating of ${reviews.avgRating} is below the industry average of 4.2. Consider focusing on customer satisfaction improvements.`,
        action: 'Review negative feedback and implement improvements',
        priority: 'high'
      });
    } else if (reviews.avgRating >= 4.5) {
      insights.push({
        type: 'success',
        category: 'Reviews',
        title: 'Excellent Customer Satisfaction',
        description: `Your average rating of ${reviews.avgRating} is excellent! Keep up the great work.`,
        action: 'Continue current practices and consider asking for more reviews',
        priority: 'low'
      });
    }

    // Response rate insights
    if (reviews.responseRate < 50) {
      insights.push({
        type: 'warning',
        category: 'Reviews',
        title: 'Low Response Rate',
        description: `You're only responding to ${reviews.responseRate}% of reviews. Responding to reviews shows you care about customer feedback.`,
        action: 'Set up automated review monitoring and response workflows',
        priority: 'medium'
      });
    }

    // Automation insights
    if (automations.errorRate > 10) {
      insights.push({
        type: 'error',
        category: 'Automation',
        title: 'High Automation Error Rate',
        description: `${automations.errorRate}% of your automation executions are failing. This could impact customer experience.`,
        action: 'Review automation logs and fix configuration issues',
        priority: 'high'
      });
    }

    // Customer engagement insights
    if (customers.engagementRate < 20) {
      insights.push({
        type: 'info',
        category: 'Customers',
        title: 'Low Customer Engagement',
        description: `Only ${customers.engagementRate}% of your customers are leaving reviews. Consider implementing a review request strategy.`,
        action: 'Set up automated review request campaigns',
        priority: 'medium'
      });
    }

    // Message delivery insights
    if (messages.deliveryRate < 90) {
      insights.push({
        type: 'warning',
        category: 'Messaging',
        title: 'Message Delivery Issues',
        description: `Only ${messages.deliveryRate}% of your messages are being delivered. Check your email/SMS configuration.`,
        action: 'Review message delivery settings and contact support',
        priority: 'high'
      });
    }

    return insights;
  };

  const calculateKPIs = (reviews, customers, automations, messages) => {
    return {
      overall: {
        customerSatisfaction: reviews.avgRating,
        responseRate: reviews.responseRate,
        automationSuccess: automations.successRate,
        messageDelivery: messages.deliveryRate,
        customerEngagement: customers.engagementRate
      },
      reviews: {
        total: reviews.totalReviews,
        average: reviews.avgRating,
        responseRate: reviews.responseRate,
        sentiment: reviews.sentimentCounts,
        platformCounts: reviews.platformCounts,
        ratingDistribution: reviews.ratingDistribution
      },
      customers: {
        total: customers.totalCustomers,
        new: customers.newCustomers,
        engaged: customers.engagedCustomers,
        engagementRate: customers.engagementRate
      },
      automations: {
        total: automations.totalExecutions,
        successful: automations.successfulExecutions,
        successRate: automations.successRate,
        errorRate: automations.errorRate,
        sourceCounts: automations.sourceCounts
      },
      messages: {
        total: messages.totalMessages,
        delivered: messages.deliveredMessages,
        deliveryRate: messages.deliveryRate,
        channelCounts: messages.channelCounts,
        statusCounts: messages.statusCounts
      }
    };
  };

  const calculateTrends = (reviews, customers, automations, messages, timeRange) => {
    // This would typically involve comparing with previous periods
    // For now, we'll return calculated trends based on current data
    return {
      reviews: {
        trend: reviews.totalReviews > 0 ? 'up' : 'stable',
        change: reviews.totalReviews > 0 ? `+${reviews.totalReviews} this period` : 'No reviews yet',
        period: `Last ${timeRange} days`
      },
      customers: {
        trend: customers.newCustomers > 0 ? 'up' : 'stable',
        change: customers.newCustomers > 0 ? `+${customers.newCustomers} new` : 'No new customers',
        period: `Last ${timeRange} days`
      },
      automations: {
        trend: automations.totalExecutions > 0 ? 'up' : 'stable',
        change: automations.totalExecutions > 0 ? `+${automations.totalExecutions} runs` : 'No automations',
        period: `Last ${timeRange} days`
      },
      messages: {
        trend: messages.totalMessages > 0 ? 'up' : 'stable',
        change: messages.totalMessages > 0 ? `+${messages.totalMessages} sent` : 'No messages',
        period: `Last ${timeRange} days`
      }
    };
  };

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return <AnalyticsError error={error} onRetry={fetchRealData} />;
  }

  if (!analyticsData) {
    return <AnalyticsError error="No data available" onRetry={fetchRealData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time insights into your business performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchRealData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights insights={analyticsData.insights} />

      {/* KPI Cards */}
      <KPICards kpis={analyticsData.kpis} trends={analyticsData.trends} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab data={analyticsData} />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <ReviewsTab data={analyticsData} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomersTab data={analyticsData} />
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <AutomationsTab data={analyticsData} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <MessagesTab data={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Component implementations continue...
const AIInsights = ({ insights }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Activity className="w-5 h-5" />
        AI Insights & Recommendations
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Systems Running Smoothly</h3>
            <p className="text-gray-600">No issues detected. Your business metrics are looking great!</p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'error' ? 'bg-red-50 border-red-500' :
                insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                insight.type === 'success' ? 'bg-green-50 border-green-500' :
                'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {insight.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />}
                {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                {insight.type === 'info' && <Info className="w-5 h-5 text-blue-500 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-2">{insight.description}</p>
                  <p className="text-sm text-gray-600">
                    <strong>Action:</strong> {insight.action}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

const KPICards = ({ kpis, trends }) => {
  const kpiData = [
    {
      title: 'Customer Satisfaction',
      value: kpis.overall.customerSatisfaction,
      unit: '/5.0',
      trend: trends.reviews,
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Response Rate',
      value: kpis.overall.responseRate,
      unit: '%',
      trend: trends.reviews,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Automation Success',
      value: kpis.overall.automationSuccess,
      unit: '%',
      trend: trends.automations,
      icon: Zap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Message Delivery',
      value: kpis.overall.messageDelivery,
      unit: '%',
      trend: trends.messages,
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Customer Engagement',
      value: kpis.overall.customerEngagement,
      unit: '%',
      trend: trends.customers,
      icon: Users,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {kpiData.map((kpi, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpi.value}{kpi.unit}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${kpi.trend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.trend.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

const OverviewTab = ({ data }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Reviews</span>
            <span className="font-semibold">{data.kpis.reviews.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">New Customers</span>
            <span className="font-semibold">{data.kpis.customers.new}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Messages Sent</span>
            <span className="font-semibold">{data.kpis.messages.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Automations Run</span>
            <span className="font-semibold">{data.kpis.automations.total}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.reviews.recentReviews.slice(0, 5).map((review, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {review.reviewer_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {review.review_text}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {review.platform}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const ReviewsTab = ({ data }) => (
  <div className="space-y-6">
    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RatingTrendChart data={data.reviews} timeRange={data.timeRange} />
      <ReviewVolumeChart data={data.reviews} timeRange={data.timeRange} />
    </div>

    {/* Charts Row 2 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <RatingDistributionChart data={data.reviews} />
      <PlatformPerformanceChart data={data.reviews} />
      <SentimentDistributionChart data={data.reviews} />
    </div>

    {/* Recent Reviews */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.reviews.recentReviews.slice(0, 10).map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">{review.reviewer_name}</p>
                  <Badge variant="outline" className="text-xs">
                    {review.platform}
                  </Badge>
                  <Badge 
                    variant={review.sentiment === 'positive' ? 'default' : 
                             review.sentiment === 'negative' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {review.sentiment}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">{review.review_text}</p>
                <p className="text-xs text-gray-500">
                  {new Date(review.review_created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {review.status === 'responded' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {review.status === 'needs_response' && (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const CustomersTab = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Customers</span>
              <span className="font-semibold">{data.kpis.customers.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Customers</span>
              <span className="font-semibold">{data.kpis.customers.new}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Engaged Customers</span>
              <span className="font-semibold">{data.kpis.customers.engaged}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Engagement Rate</span>
              <span className="font-semibold">{data.kpis.customers.engagementRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Growth chart coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const AutomationsTab = ({ data }) => (
  <div className="space-y-6">
    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AutomationPerformanceChart data={data.automations} timeRange={data.timeRange} />
      <Card>
        <CardHeader>
          <CardTitle>Automation Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Executions</span>
              <span className="font-semibold">{data.kpis.automations.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Successful</span>
              <span className="font-semibold text-green-600">{data.kpis.automations.successful}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="font-semibold">{data.kpis.automations.successRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="font-semibold text-red-600">{data.kpis.automations.errorRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Execution Sources */}
    <Card>
      <CardHeader>
        <CardTitle>Execution Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(data.kpis.automations.sourceCounts).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium capitalize">{source}</span>
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Recent Automation Logs */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Automation Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.automations.logs.slice(0, 10).map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className={`w-3 h-3 rounded-full ${
                log.status === 'success' ? 'bg-green-500' : 
                log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{log.message}</p>
                <p className="text-xs text-gray-500">
                  {log.source} • {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              <Badge 
                variant={log.status === 'success' ? 'default' : 
                         log.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {log.status}
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const MessagesTab = ({ data }) => (
  <div className="space-y-6">
    {/* Charts Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MessageDeliveryChart data={data.messages} timeRange={data.timeRange} />
      <ChannelPerformanceChart data={data.messages} />
    </div>

    {/* Message Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Message Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Messages</span>
              <span className="font-semibold">{data.kpis.messages.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivered</span>
              <span className="font-semibold text-green-600">{data.kpis.messages.delivered}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="font-semibold">{data.kpis.messages.deliveryRate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.kpis.messages.channelCounts).map(([channel, count]) => (
              <div key={channel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium capitalize">{channel}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Recent Messages */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.messages.messages.slice(0, 10).map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className={`w-3 h-3 rounded-full ${
                message.status === 'delivered' ? 'bg-green-500' : 
                message.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">
                    {message.channel === 'email' ? 'Email' : 'SMS'} Message
                  </p>
                  <Badge 
                    variant={message.status === 'delivered' ? 'default' : 
                             message.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {message.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {message.channel === 'email' ? (
                  <Mail className="w-4 h-4 text-blue-500" />
                ) : (
                  <Smartphone className="w-4 h-4 text-green-500" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>
      <div className="flex gap-3">
        <div className="h-10 bg-gray-200 rounded w-32"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
      ))}
    </div>
  </div>
);

const AnalyticsError = ({ error, onRetry }) => (
  <div className="text-center py-12">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
    <p className="text-gray-600 mb-4">{error}</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

export default RealTimeAnalytics;
