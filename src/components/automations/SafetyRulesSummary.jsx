import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

const SafetyRulesSummary = ({ safetyRules, loading, error }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Sending Rules</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-slate-600">Loading safety rules...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Sending Rules</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load safety rules: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!safetyRules) {
    return null;
  }

  const formatRateLimit = (limit) => {
    if (limit === 'Unlimited' || limit === 'Not configured') {
      return limit;
    }
    return `${limit.toLocaleString()}/period`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <span>Sending Rules</span>
        </CardTitle>
        <p className="text-sm text-slate-600">
          Safety rules that protect your customers and maintain compliance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate Limits */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Rate Limits</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Per Hour:</span>
              <Badge variant="outline" className="text-xs">
                {formatRateLimit(safetyRules.rateLimits.hourly)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Per Day:</span>
              <Badge variant="outline" className="text-xs">
                {formatRateLimit(safetyRules.rateLimits.daily)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Customer Cooldown */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Customer Cooldown</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">
              Minimum {safetyRules.cooldown.days} days between review requests
            </span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        </div>

        {/* Safety Checks */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Safety Checks</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-slate-600">Skip unsubscribed customers</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-slate-600">Skip Do-Not-Contact customers</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-slate-600">Skip hard-bounced emails</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-slate-600">Respect quiet hours ({safetyRules.timezone})</span>
            </div>
          </div>
        </div>

        {/* Business Timezone */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Business Timezone:</span>
            <Badge variant="secondary" className="text-xs">
              {safetyRules.timezone}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SafetyRulesSummary;
