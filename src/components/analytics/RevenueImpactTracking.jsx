import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, DollarSign, TrendingUp, TrendingDown, Users, Mail, MousePointer, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';

export default function RevenueImpactTracking() {
  const { business } = useBusiness();
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [includeEstimates, setIncludeEstimates] = useState(true);

  const fetchRevenueImpact = async () => {
    if (!business?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/revenue-impact', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_id: business.id,
          period,
          include_estimates: includeEstimates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue impact data');
      }

      const data = await response.json();
      setRevenueData(data.revenue_impact);
    } catch (err) {
      console.error('Error fetching revenue impact:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchRevenueImpact();
    }
  }, [business?.id, period, includeEstimates]);

  if (!business?.id) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Please complete your business setup to view revenue impact tracking.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Impact Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="quarter">Past Quarter</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Include Estimates</label>
              <Select value={includeEstimates.toString()} onValueChange={(value) => setIncludeEstimates(value === 'true')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchRevenueImpact} disabled={loading} className="mt-6">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Calculating revenue impact...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Data */}
      {revenueData && !loading && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estimated Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(revenueData.revenue_impact?.estimated_revenue || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">New Customers</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {revenueData.revenue_impact?.estimated_new_customers || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ROI</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {revenueData.revenue_impact?.roi_percentage || 0}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Lifetime Value</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(revenueData.revenue_impact?.estimated_lifetime_value || 0)}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {revenueData.metrics?.total_emails_sent || 0}
                  </div>
                  <div className="text-sm text-gray-500">Emails Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {revenueData.metrics?.email_open_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Open Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {revenueData.metrics?.email_click_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Click Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Review Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {revenueData.metrics?.total_reviews || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {revenueData.metrics?.positive_reviews || 0}
                  </div>
                  <div className="text-sm text-gray-500">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {revenueData.metrics?.negative_reviews || 0}
                  </div>
                  <div className="text-sm text-gray-500">Negative</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {revenueData.metrics?.review_request_effectiveness || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Effectiveness</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Reviews */}
          {revenueData.insights?.top_performing_reviews && revenueData.insights.top_performing_reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performing Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.insights.top_performing_reviews.map((review, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{review.platform}</Badge>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                              >
                                ★
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(review.potential_revenue)}
                          </div>
                          <div className="text-xs text-gray-500">Potential Revenue</div>
                        </div>
                      </div>
                      <p className="text-gray-700 italic">"{review.text}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Improvement Opportunities */}
          {revenueData.insights?.improvement_opportunities && revenueData.insights.improvement_opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Improvement Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.insights.improvement_opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{opportunity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {revenueData.recommendations && revenueData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          {includeEstimates && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Revenue estimates are based on industry averages and may not reflect your actual results. 
                Use these metrics as a guide to understand the potential impact of your review management efforts.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* No Data State */}
      {revenueData && revenueData.metrics?.total_reviews === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Revenue Data Yet</h3>
            <p className="text-gray-500 mb-4">
              Start sending review requests to track revenue impact.
            </p>
            <Button onClick={() => window.location.href = '/send-requests'}>
              Send Review Requests
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
