import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  MessageSquare,
  TrendingDown
} from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    className="cursor-pointer"
  >
    <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${color}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1 opacity-90">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
          </div>
          <div className="p-3 rounded-xl bg-white bg-opacity-20">
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-3 text-sm">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
            )}
            <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
              {trend.value}
            </span>
            <span className="text-gray-600 ml-1">vs last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default function ReviewsDashboard({ businessId, onFilterChange }) {
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    responseRate: 0,
    averageRating: 0,
    slaCompliance: 100,
    newReviewsThisWeek: 0,
    unrepliedReviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/reviews/analytics?business_id=${businessId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <p className="text-gray-600 mt-1">Monitor and respond to customer reviews across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            SLA: 4h for issues
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {analytics.slaCompliance}% compliance
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard
          title="Unreplied Reviews"
          value={analytics.unrepliedReviews}
          icon={AlertCircle}
          color="bg-gradient-to-br from-red-50 to-red-100 border-red-200"
          onClick={() => onFilterChange({ status: 'unread' })}
        />
        
        <KPICard
          title="Average Rating"
          value={analytics.averageRating}
          subtitle="⭐ All platforms"
          icon={Star}
          color="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
          trend={{ direction: 'up', value: '+0.2' }}
        />
        
        <KPICard
          title="New This Week"
          value={analytics.newReviewsThisWeek}
          subtitle="Last 7 days"
          icon={TrendingUp}
          color="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          trend={{ direction: 'up', value: '+12%' }}
        />
        
        <KPICard
          title="Response Rate"
          value={`${analytics.responseRate}%`}
          subtitle="All time"
          icon={MessageSquare}
          color="bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          trend={{ direction: 'up', value: '+5%' }}
        />
      </div>
    </div>
  );
}
