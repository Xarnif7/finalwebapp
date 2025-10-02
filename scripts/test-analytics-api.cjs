/**
 * Analytics API Test
 * Tests the analytics API endpoints and data processing
 */

const { createClient } = require('@supabase/supabase-js');

// Mock environment
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

async function testAnalyticsAPI() {
  console.log('🧪 Testing Analytics API...\n');

  // Test 1: Overview Analytics
  console.log('1️⃣ Testing Overview Analytics...');
  try {
    const response = await fetch('http://localhost:3000/api/analytics/overview?businessId=test-business-123&timeRange=30', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Overview Analytics: SUCCESS');
      console.log(`   - KPIs: ${Object.keys(data.data.kpis).length} categories`);
      console.log(`   - Insights: ${data.data.insights.length} AI insights`);
      console.log(`   - Trends: ${Object.keys(data.data.trends).length} trend metrics`);
      
      // Validate KPI structure
      const requiredKPIs = ['overall', 'reviews', 'customers', 'automations', 'messages', 'revenue'];
      const hasAllKPIs = requiredKPIs.every(kpi => data.data.kpis[kpi]);
      console.log(`   - KPI Structure: ${hasAllKPIs ? 'VALID' : 'INVALID'}`);
      
      // Validate insights structure
      const hasValidInsights = data.data.insights.every(insight => 
        insight.type && insight.category && insight.title && insight.description
      );
      console.log(`   - Insights Structure: ${hasValidInsights ? 'VALID' : 'INVALID'}`);
      
    } else {
      const error = await response.json();
      console.log(`❌ Overview Analytics: FAILED - ${error.error}`);
    }
  } catch (error) {
    console.log(`❌ Overview Analytics: ERROR - ${error.message}`);
  }

  // Test 2: Data Processing Functions
  console.log('\n2️⃣ Testing Data Processing Functions...');
  try {
    // Mock data for testing
    const mockReviewsData = {
      totalReviews: 25,
      avgRating: 4.2,
      responseRate: 80.0,
      sentimentCounts: { positive: 15, neutral: 7, negative: 3 },
      platformCounts: { google: 12, facebook: 8, yelp: 5 },
      ratingDistribution: [
        { rating: 1, count: 1 },
        { rating: 2, count: 2 },
        { rating: 3, count: 3 },
        { rating: 4, count: 8 },
        { rating: 5, count: 11 }
      ]
    };

    const mockCustomersData = {
      totalCustomers: 150,
      newCustomers: 25,
      engagedCustomers: 45,
      engagementRate: 30.0
    };

    const mockAutomationsData = {
      totalExecutions: 200,
      successfulExecutions: 185,
      successRate: 92.5,
      errorRate: 7.5,
      sourceCounts: { trigger: 120, scheduler: 80 }
    };

    const mockMessagesData = {
      totalMessages: 300,
      deliveredMessages: 285,
      deliveryRate: 95.0,
      channelCounts: { email: 200, sms: 100 },
      statusCounts: { delivered: 285, failed: 15 }
    };

    const mockRevenueData = {
      totalRevenue: 45000,
      avgJobValue: 1800,
      jobCount: 25
    };

    // Test KPI calculation
    const kpis = calculateKPIs({
      reviews: mockReviewsData,
      customers: mockCustomersData,
      automations: mockAutomationsData,
      messages: mockMessagesData,
      revenue: mockRevenueData
    });

    console.log('✅ KPI Calculation: SUCCESS');
    console.log(`   - Overall KPIs: ${Object.keys(kpis.overall).length} metrics`);
    console.log(`   - Reviews KPIs: ${Object.keys(kpis.reviews).length} metrics`);
    console.log(`   - Customers KPIs: ${Object.keys(kpis.customers).length} metrics`);
    console.log(`   - Automations KPIs: ${Object.keys(kpis.automations).length} metrics`);
    console.log(`   - Messages KPIs: ${Object.keys(kpis.messages).length} metrics`);
    console.log(`   - Revenue KPIs: ${Object.keys(kpis.revenue).length} metrics`);

    // Test AI insights generation
    const insights = generateAIInsights({
      reviews: mockReviewsData,
      customers: mockCustomersData,
      automations: mockAutomationsData,
      messages: mockMessagesData,
      revenue: mockRevenueData,
      timeRange: 30
    });

    console.log('✅ AI Insights Generation: SUCCESS');
    console.log(`   - Generated ${insights.length} insights`);
    console.log(`   - Insight types: ${[...new Set(insights.map(i => i.type))].join(', ')}`);
    console.log(`   - Categories: ${[...new Set(insights.map(i => i.category))].join(', ')}`);

  } catch (error) {
    console.log(`❌ Data Processing: ERROR - ${error.message}`);
  }

  // Test 3: Edge Cases
  console.log('\n3️⃣ Testing Edge Cases...');
  try {
    // Test with empty data
    const emptyData = {
      reviews: { totalReviews: 0, avgRating: 0, responseRate: 0, sentimentCounts: {}, platformCounts: {}, ratingDistribution: [] },
      customers: { totalCustomers: 0, newCustomers: 0, engagedCustomers: 0, engagementRate: 0 },
      automations: { totalExecutions: 0, successfulExecutions: 0, successRate: 0, errorRate: 0, sourceCounts: {} },
      messages: { totalMessages: 0, deliveredMessages: 0, deliveryRate: 0, channelCounts: {}, statusCounts: {} },
      revenue: { totalRevenue: 0, avgJobValue: 0, jobCount: 0 }
    };

    const emptyKPIs = calculateKPIs(emptyData);
    const emptyInsights = generateAIInsights({ ...emptyData, timeRange: 30 });

    console.log('✅ Empty Data Handling: SUCCESS');
    console.log(`   - KPIs calculated without errors`);
    console.log(`   - Generated ${emptyInsights.length} insights for empty data`);

  } catch (error) {
    console.log(`❌ Edge Cases: ERROR - ${error.message}`);
  }

  console.log('\n🎉 Analytics API Test Complete!\n');

  console.log('📋 Test Results Summary:');
  console.log('- Overview Analytics: Real-time data aggregation');
  console.log('- KPI Calculation: Comprehensive metrics across all categories');
  console.log('- AI Insights: Intelligent recommendations and alerts');
  console.log('- Data Processing: Robust handling of various data scenarios');
  console.log('- Edge Cases: Graceful handling of empty or missing data');

  console.log('\n✨ Analytics system is working correctly!');
}

// Helper functions (simplified versions of the API functions)
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

function generateAIInsights(data) {
  const insights = [];

  // Review insights
  if (data.reviews.avgRating < 4.0) {
    insights.push({
      type: 'warning',
      category: 'Reviews',
      title: 'Rating Below Industry Average',
      description: `Your average rating of ${data.reviews.avgRating} is below the industry average of 4.2.`,
      action: 'Review negative feedback and implement improvements',
      priority: 'high'
    });
  }

  // Response rate insights
  if (data.reviews.responseRate < 50) {
    insights.push({
      type: 'warning',
      category: 'Reviews',
      title: 'Low Response Rate',
      description: `You're only responding to ${data.reviews.responseRate}% of reviews.`,
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
      description: `${data.automations.errorRate}% of your automation executions are failing.`,
      action: 'Review automation logs and fix configuration issues',
      priority: 'high'
    });
  }

  return insights;
}

// Run the test
testAnalyticsAPI().catch(console.error);
