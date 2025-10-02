import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, timeRange = '30' } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Calculate date range
    const now = new Date();
    const days = parseInt(timeRange);
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch all analytics data in parallel
    const [
      reviewsData,
      customersData,
      automationsData,
      messagesData,
      revenueData
    ] = await Promise.all([
      getReviewsAnalytics(businessId, startDate),
      getCustomersAnalytics(businessId, startDate),
      getAutomationsAnalytics(businessId, startDate),
      getMessagesAnalytics(businessId, startDate),
      getRevenueAnalytics(businessId, startDate)
    ]);

    // Calculate AI insights
    const insights = generateAIInsights({
      reviews: reviewsData,
      customers: customersData,
      automations: automationsData,
      messages: messagesData,
      revenue: revenueData,
      timeRange: days
    });

    // Calculate KPIs
    const kpis = calculateKPIs({
      reviews: reviewsData,
      customers: customersData,
      automations: automationsData,
      messages: messagesData,
      revenue: revenueData
    });

    // Calculate trends
    const trends = calculateTrends({
      reviews: reviewsData,
      customers: customersData,
      automations: automationsData,
      messages: messagesData,
      revenue: revenueData,
      timeRange: days
    });

    res.status(200).json({
      success: true,
      data: {
        kpis,
        trends,
        insights,
        timeRange: days,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}

async function getReviewsAnalytics(businessId, startDate) {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .gte('review_created_at', startDate.toISOString());

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

  return {
    totalReviews,
    avgRating: parseFloat(avgRating.toFixed(1)),
    responseRate: parseFloat(responseRate.toFixed(1)),
    sentimentCounts,
    platformCounts,
    ratingDistribution,
    reviews
  };
}

async function getCustomersAnalytics(businessId, startDate) {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const totalCustomers = customers.length;
  const newCustomers = customers.length; // All customers in time range are new

  // Customer engagement (customers with reviews)
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
}

async function getAutomationsAnalytics(businessId, startDate) {
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString());

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
}

async function getMessagesAnalytics(businessId, startDate) {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString());

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
}

async function getRevenueAnalytics(businessId, startDate) {
  // This would typically come from your CRM integration
  // For now, we'll calculate based on job amounts from reviews
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('job_amount')
    .eq('business_id', businessId)
    .gte('review_created_at', startDate.toISOString())
    .not('job_amount', 'is', null);

  if (error) throw error;

  const totalRevenue = reviews.reduce((sum, r) => sum + (parseFloat(r.job_amount) || 0), 0);
  const avgJobValue = reviews.length > 0 ? totalRevenue / reviews.length : 0;

  return {
    totalRevenue,
    avgJobValue: parseFloat(avgJobValue.toFixed(2)),
    jobCount: reviews.length
  };
}

function generateAIInsights(data) {
  const insights = [];

  // Review insights
  if (data.reviews.avgRating < 4.0) {
    insights.push({
      type: 'warning',
      category: 'Reviews',
      title: 'Rating Below Industry Average',
      description: `Your average rating of ${data.reviews.avgRating} is below the industry average of 4.2. Consider focusing on customer satisfaction improvements.`,
      action: 'Review negative feedback and implement improvements',
      priority: 'high'
    });
  } else if (data.reviews.avgRating >= 4.5) {
    insights.push({
      type: 'success',
      category: 'Reviews',
      title: 'Excellent Customer Satisfaction',
      description: `Your average rating of ${data.reviews.avgRating} is excellent! Keep up the great work.`,
      action: 'Continue current practices and consider asking for more reviews',
      priority: 'low'
    });
  }

  // Response rate insights
  if (data.reviews.responseRate < 50) {
    insights.push({
      type: 'warning',
      category: 'Reviews',
      title: 'Low Response Rate',
      description: `You're only responding to ${data.reviews.responseRate}% of reviews. Responding to reviews shows you care about customer feedback.`,
      action: 'Set up automated review monitoring and response workflows',
      priority: 'medium'
    });
  }

  // Automation insights
  if (data.automations.errorRate > 10) {
    insights.push({
      type: 'error',
      category: 'Automation',
      title: 'High Automation Error Rate',
      description: `${data.automations.errorRate}% of your automation executions are failing. This could impact customer experience.`,
      action: 'Review automation logs and fix configuration issues',
      priority: 'high'
    });
  }

  // Customer engagement insights
  if (data.customers.engagementRate < 20) {
    insights.push({
      type: 'info',
      category: 'Customers',
      title: 'Low Customer Engagement',
      description: `Only ${data.customers.engagementRate}% of your customers are leaving reviews. Consider implementing a review request strategy.`,
      action: 'Set up automated review request campaigns',
      priority: 'medium'
    });
  }

  // Message delivery insights
  if (data.messages.deliveryRate < 90) {
    insights.push({
      type: 'warning',
      category: 'Messaging',
      title: 'Message Delivery Issues',
      description: `Only ${data.messages.deliveryRate}% of your messages are being delivered. Check your email/SMS configuration.`,
      action: 'Review message delivery settings and contact support',
      priority: 'high'
    });
  }

  return insights;
}

function calculateKPIs(data) {
  return {
    overall: {
      customerSatisfaction: data.reviews.avgRating,
      responseRate: data.reviews.responseRate,
      automationSuccess: data.automations.successRate,
      messageDelivery: data.messages.deliveryRate,
      customerEngagement: data.customers.engagementRate
    },
    reviews: {
      total: data.reviews.totalReviews,
      average: data.reviews.avgRating,
      responseRate: data.reviews.responseRate,
      sentiment: data.reviews.sentimentCounts
    },
    customers: {
      total: data.customers.totalCustomers,
      new: data.customers.newCustomers,
      engaged: data.customers.engagedCustomers,
      engagementRate: data.customers.engagementRate
    },
    automations: {
      total: data.automations.totalExecutions,
      successful: data.automations.successfulExecutions,
      successRate: data.automations.successRate,
      errorRate: data.automations.errorRate
    },
    messages: {
      total: data.messages.totalMessages,
      delivered: data.messages.deliveredMessages,
      deliveryRate: data.messages.deliveryRate
    },
    revenue: {
      total: data.revenue.totalRevenue,
      average: data.revenue.avgJobValue,
      jobs: data.revenue.jobCount
    }
  };
}

function calculateTrends(data, timeRange) {
  // This would typically involve comparing with previous periods
  // For now, we'll return mock trend data
  return {
    reviews: {
      trend: 'up',
      change: '+12%',
      period: `vs last ${timeRange} days`
    },
    customers: {
      trend: 'up',
      change: '+8%',
      period: `vs last ${timeRange} days`
    },
    automations: {
      trend: 'up',
      change: '+15%',
      period: `vs last ${timeRange} days`
    },
    messages: {
      trend: 'up',
      change: '+22%',
      period: `vs last ${timeRange} days`
    }
  };
}
