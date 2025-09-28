import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { 
  Mail, 
  MousePointer, 
  Reply, 
  TrendingUp, 
  Users, 
  Clock,
  BarChart3,
  Lightbulb,
  Target
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/browser';

const Reporting = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const [emailMetrics, setEmailMetrics] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailAnalytics();
  }, [user]);

  const fetchEmailAnalytics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.business_id) {
        setLoading(false);
        return;
      }

      // Fetch email analytics for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: analytics } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('business_id', profile.business_id)
        .gte('sent_at', thirtyDaysAgo.toISOString());

      if (analytics) {
        const totalSent = analytics.length;
        const totalOpened = analytics.filter(email => email.opened_at).length;
        const totalClicked = analytics.filter(email => email.clicked_at).length;
        const totalReplied = analytics.filter(email => email.replied_at).length;

        setEmailMetrics({
          totalSent,
          totalOpened,
          totalClicked,
          totalReplied,
          openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
          clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0,
          replyRate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching email analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const emailMetricsData = [
    {
      title: "Emails Sent",
      value: emailMetrics.totalSent.toLocaleString(),
      icon: Mail,
      iconColor: "text-blue-600",
      description: "Total emails sent to customers"
    },
    {
      title: "Open Rate",
      value: `${emailMetrics.openRate}%`,
      icon: MousePointer,
      iconColor: "text-green-600",
      description: "Percentage of emails opened"
    },
    {
      title: "Click Rate",
      value: `${emailMetrics.clickRate}%`,
      icon: TrendingUp,
      iconColor: "text-purple-600",
      description: "Percentage of emails with clicks"
    },
    {
      title: "Reply Rate",
      value: `${emailMetrics.replyRate}%`,
      icon: Reply,
      iconColor: "text-orange-600",
      description: "Percentage of emails with replies"
    }
  ];

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Email Performance Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {emailMetricsData.map((metric, index) => (
          <Card key={index} className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <metric.icon className={`h-5 w-5 ${metric.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? '...' : metric.value}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Performance Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Response Time
              </CardTitle>
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : '2.4h'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average time to respond to emails
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Customer Engagement
              </CardTitle>
              <Users className="h-5 w-5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : '87%'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active customer engagement rate
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Conversion Rate
              </CardTitle>
              <Target className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : '23%'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Email to review conversion rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const AIInsightsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Intelligent analysis of your email performance and customer behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI Insights Coming Soon
            </h3>
            <p className="text-gray-500">
              We're working on advanced AI analytics to help you understand customer sentiment, 
              predict engagement patterns, and optimize your email campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CompetitorsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Competitor Analysis
          </CardTitle>
          <CardDescription>
            Compare your performance against competitors in your industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Competitor Analysis Coming Soon
            </h3>
            <p className="text-gray-500">
              Track your performance against industry benchmarks and competitor metrics 
              to stay ahead of the competition.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track email performance, customer engagement, and business insights
            </p>
          </div>
          <Button onClick={fetchEmailAnalytics} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 mt-0 p-6">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="ai-insights" className="flex-1 mt-0 p-6">
            <AIInsightsTab />
          </TabsContent>

          <TabsContent value="competitors" className="flex-1 mt-0 p-6">
            <CompetitorsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reporting;
