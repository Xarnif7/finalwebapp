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
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/browser';
import { motion } from 'framer-motion';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      getBusinessId();
    }
  }, [user?.id]);

  useEffect(() => {
    if (businessId) {
      fetchAnalytics();
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
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/overview?businessId=${businessId}&timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        console.error('Error fetching analytics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Implement data export functionality
    console.log('Exporting analytics data...');
  };

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (!analyticsData) {
    return <AnalyticsError onRetry={fetchAnalytics} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into your business performance
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
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
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
        {insights.map((insight, index) => (
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
        ))}
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
        <CardTitle>Revenue Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Revenue</span>
            <span className="font-semibold">${data.kpis.revenue.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Average Job Value</span>
            <span className="font-semibold">${data.kpis.revenue.average.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Jobs Completed</span>
            <span className="font-semibold">{data.kpis.revenue.jobs}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ReviewsTab = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.kpis.reviews.ratingDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.rating}★</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(item.count / Math.max(...data.kpis.reviews.ratingDistribution.map(r => r.count))) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-600">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.kpis.reviews.platformCounts).map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{platform}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.kpis.reviews.sentiment).map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{sentiment}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Automation Performance</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Execution Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.kpis.automations.sourceCounts).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{source}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const MessagesTab = ({ data }) => (
  <div className="space-y-6">
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
              <div key={channel} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{channel}</span>
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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

const AnalyticsError = ({ onRetry }) => (
  <div className="text-center py-12">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
    <p className="text-gray-600 mb-4">There was an error loading your analytics data.</p>
    <Button onClick={onRetry}>Try Again</Button>
  </div>
);

export default AnalyticsDashboard;
