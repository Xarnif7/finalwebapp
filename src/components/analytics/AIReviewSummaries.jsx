import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, TrendingUp, TrendingDown, Star, MessageSquare, Target, Lightbulb } from 'lucide-react';
import { useBusiness } from '../../hooks/useBusiness';

export default function AIReviewSummaries() {
  const { business } = useBusiness();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [summaryType, setSummaryType] = useState('overview');

  const fetchSummary = async () => {
    if (!business?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/review-summaries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          business_id: business.id,
          period,
          summary_type: summaryType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching review summary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchSummary();
    }
  }, [business?.id, period, summaryType]);

  if (!business?.id) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Please complete your business setup to view AI review summaries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Review Summaries
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Summary Type</label>
              <Select value={summaryType} onValueChange={setSummaryType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="actionable">Actionable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchSummary} disabled={loading} className="mt-6">
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
              <span className="ml-2">Generating AI summary...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Content */}
      {summary && !loading && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-gray-700 mb-4">{summary.overview}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{summary.key_metrics?.total_reviews || 0}</div>
                  <div className="text-sm text-gray-500">Total Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.key_metrics?.average_rating?.toFixed(1) || '0.0'}</div>
                  <div className="text-sm text-gray-500">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.key_metrics?.positive_percentage || 0}%</div>
                  <div className="text-sm text-gray-500">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.key_metrics?.negative_percentage || 0}%</div>
                  <div className="text-sm text-gray-500">Negative</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Themes */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Positive Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Top Positive Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.top_positive_themes?.map((theme, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-2">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Negative Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.top_negative_themes?.map((theme, index) => (
                    <Badge key={index} variant="destructive" className="mr-2 mb-2">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.recommendations?.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Notable Quotes */}
          {summary.notable_quotes && summary.notable_quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Notable Customer Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.notable_quotes.map((quote, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <p className="text-gray-700 italic mb-2">"{quote.text}"</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < quote.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant={quote.sentiment === 'positive' ? 'default' : quote.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                          {quote.sentiment}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No Reviews State */}
      {summary && summary.total_reviews === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Reviews Yet</h3>
            <p className="text-gray-500 mb-4">
              {summary.message || `No reviews found for the ${period} period.`}
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
