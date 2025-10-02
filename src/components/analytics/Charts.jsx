import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  ComposedChart,
  Scatter,
  ScatterChart
} from 'recharts';

// Color palette for consistent theming
const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  gray: '#6B7280'
};

const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#84CC16'
];

// Rating Trend Chart
export const RatingTrendChart = ({ data, timeRange }) => {
  const chartData = generateRatingTrendData(data, timeRange);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Trend Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 5]}
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [value, 'Average Rating']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke={COLORS.primary} 
                strokeWidth={3}
                dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Review Volume Chart
export const ReviewVolumeChart = ({ data, timeRange }) => {
  const chartData = generateReviewVolumeData(data, timeRange);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Volume Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [value, 'Reviews']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="reviews" 
                stroke={COLORS.primary} 
                fill={COLORS.primary}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Platform Performance Chart
export const PlatformPerformanceChart = ({ data }) => {
  const chartData = Object.entries(data.platformCounts).map(([platform, count]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    count,
    percentage: data.total > 0 ? ((count / data.total) * 100).toFixed(1) : 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="number"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category"
                dataKey="platform"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => [
                  `${value} reviews (${props.payload.percentage}%)`,
                  'Reviews'
                ]}
                labelFormatter={(label) => `Platform: ${label}`}
              />
              <Bar 
                dataKey="count" 
                fill={COLORS.primary}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Sentiment Distribution Chart
export const SentimentDistributionChart = ({ data }) => {
  const chartData = Object.entries(data.sentimentCounts).map(([sentiment, count], index) => ({
    name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    value: count,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [value, 'Reviews']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex gap-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Rating Distribution Chart
export const RatingDistributionChart = ({ data }) => {
  const chartData = data.ratingDistribution.map(item => ({
    ...item,
    percentage: data.total > 0 ? ((item.count / data.total) * 100).toFixed(1) : 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="rating" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => [
                  `${value} reviews (${props.payload.percentage}%)`,
                  'Reviews'
                ]}
                labelFormatter={(label) => `${label} Star${label !== 1 ? 's' : ''}`}
              />
              <Bar 
                dataKey="count" 
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Automation Performance Chart
export const AutomationPerformanceChart = ({ data, timeRange }) => {
  const chartData = generateAutomationTrendData(data, timeRange);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Performance Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [
                  value, 
                  name === 'success' ? 'Successful' : 
                  name === 'failed' ? 'Failed' : 'Success Rate (%)'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar yAxisId="left" dataKey="success" stackId="a" fill={COLORS.success} />
              <Bar yAxisId="left" dataKey="failed" stackId="a" fill={COLORS.error} />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="successRate" 
                stroke={COLORS.primary} 
                strokeWidth={2}
                dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Message Delivery Chart
export const MessageDeliveryChart = ({ data, timeRange }) => {
  const chartData = generateMessageDeliveryData(data, timeRange);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Delivery Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name) => [
                  value, 
                  name === 'delivered' ? 'Delivered' : 
                  name === 'failed' ? 'Failed' : 'Total'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="delivered" 
                stackId="1"
                stroke={COLORS.success} 
                fill={COLORS.success}
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="failed" 
                stackId="1"
                stroke={COLORS.error} 
                fill={COLORS.error}
                fillOpacity={0.6}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Channel Performance Chart
export const ChannelPerformanceChart = ({ data }) => {
  const chartData = Object.entries(data.channelCounts).map(([channel, count]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    count,
    percentage: data.total > 0 ? ((count / data.total) * 100).toFixed(1) : 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="count"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => [
                  `${value} messages (${props.payload.percentage}%)`,
                  'Messages'
                ]}
                labelFormatter={(label) => `Channel: ${label}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="flex gap-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{item.channel}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions to generate chart data
function generateRatingTrendData(data, timeRange) {
  // Generate mock trend data based on time range
  const days = parseInt(timeRange);
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate rating trend with some variation
    const baseRating = data.avgRating || 4.0;
    const variation = (Math.random() - 0.5) * 0.8; // ±0.4 variation
    const rating = Math.max(1, Math.min(5, baseRating + variation));
    
    chartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: parseFloat(rating.toFixed(1))
    });
  }
  
  return chartData;
}

function generateReviewVolumeData(data, timeRange) {
  const days = parseInt(timeRange);
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate review volume with some variation
    const baseVolume = data.total > 0 ? Math.max(1, data.total / days) : 0;
    const variation = Math.random() * 2; // 0-2 additional reviews
    const reviews = Math.floor(baseVolume + variation);
    
    chartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      reviews
    });
  }
  
  return chartData;
}

function generateAutomationTrendData(data, timeRange) {
  const days = parseInt(timeRange);
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate automation data
    const baseExecutions = data.total > 0 ? Math.max(1, data.total / days) : 0;
    const successRate = data.successRate || 90;
    const successful = Math.floor(baseExecutions * (successRate / 100));
    const failed = Math.floor(baseExecutions * ((100 - successRate) / 100));
    
    chartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      success: successful,
      failed: failed,
      successRate: successRate
    });
  }
  
  return chartData;
}

function generateMessageDeliveryData(data, timeRange) {
  const days = parseInt(timeRange);
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate message delivery data
    const baseMessages = data.total > 0 ? Math.max(1, data.total / days) : 0;
    const deliveryRate = data.deliveryRate || 95;
    const delivered = Math.floor(baseMessages * (deliveryRate / 100));
    const failed = Math.floor(baseMessages * ((100 - deliveryRate) / 100));
    
    chartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      delivered: delivered,
      failed: failed,
      total: baseMessages
    });
  }
  
  return chartData;
}
