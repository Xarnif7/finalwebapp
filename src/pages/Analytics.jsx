import React from 'react';
// import RealTimeAnalytics from '../components/analytics/RealTimeAnalytics';
import { BarChart3, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const Analytics = () => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-12 pb-12 px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <BarChart3 className="h-16 w-16 text-blue-500" />
              <Clock className="h-6 w-6 text-gray-400 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Analytics Coming Soon
          </h2>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            We're building powerful analytics and insights to help you track your review performance, customer sentiment, and business impact.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Check back soon for detailed metrics and reports</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;