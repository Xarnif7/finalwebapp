import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useAutomationKPIs } from '../../hooks/useAutomationKPIs';

const AutomationKPIs = ({ onKpiClick }) => {
  const { kpis, loading, error } = useAutomationKPIs();

  const handleKpiClick = (filterType, filterValue) => {
    if (onKpiClick) {
      onKpiClick(filterType, filterValue);
    }
  };

  const getTrendIcon = (value, previousValue) => {
    if (value > previousValue) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (value < previousValue) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (value, previousValue) => {
    if (value > previousValue) return 'text-green-600';
    if (value < previousValue) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Error loading KPIs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Active Sequences */}
      <Card 
        className="hover:shadow-[0_0_20px_rgba(26,115,232,0.15)] hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer group"
        onClick={() => handleKpiClick('status', 'active')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Active Sequences
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-slate-900">
              {kpis.activeSequences}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
              <span className="text-sm text-gray-500">
                Currently running
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers in Sequences */}
      <Card 
        className="hover:shadow-[0_0_20px_rgba(26,115,232,0.15)] hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer group"
        onClick={() => handleKpiClick('enrollment', 'active')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Customers in Sequences
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-slate-900">
              {kpis.customersInSequences}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Enrolled
              </Badge>
              <span className="text-sm text-gray-500">
                Currently active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Conversion Rate */}
      <Card 
        className="hover:shadow-[0_0_20px_rgba(26,115,232,0.15)] hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer group"
        onClick={() => handleKpiClick('conversion', '7d')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              7-Day Conversion
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-slate-900">
              {kpis.conversionRate7d}%
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={`${
                  kpis.conversionRate7d >= 20 
                    ? 'bg-green-100 text-green-800' 
                    : kpis.conversionRate7d >= 10 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {kpis.conversionRate7d >= 20 ? 'Excellent' : 
                 kpis.conversionRate7d >= 10 ? 'Good' : 'Needs Improvement'}
              </Badge>
              <span className="text-sm text-gray-500">
                Reviews / Requests
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationKPIs;
