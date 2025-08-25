import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, windowDays = '30', timeseries = 'false' } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId parameter' });
    }

    const days = parseInt(windowDays as string);
    const includeTimeseries = timeseries === 'true';
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch reviews for the time period
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (reviewsError) {
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }

    // Fetch review replies for response time calculation
    const { data: replies, error: repliesError } = await supabase
      .from('review_replies')
      .select('*')
      .eq('business_id', businessId)
      .gte('replied_at', startDate.toISOString());

    if (repliesError && repliesError.code !== 'PGRST116') {
      // PGRST116 is "table doesn't exist" - we'll create it later
      return res.status(500).json({ error: 'Failed to fetch replies' });
    }

    // Calculate metrics
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;
    
    const repliedReviews = reviews.filter(r => r.responded).length;
    const replyRatePct = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

    // Calculate average response time
    let avgResponseTimeHours = 0;
    if (replies && replies.length > 0) {
      const responseTimes = [];
      for (const reply of replies) {
        const review = reviews.find(r => r.id === reply.review_id);
        if (review) {
          const responseTime = new Date(reply.replied_at).getTime() - new Date(review.created_at).getTime();
          responseTimes.push(responseTime / (1000 * 60 * 60)); // Convert to hours
        }
      }
      avgResponseTimeHours = responseTimes.length > 0 
        ? parseFloat((responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(1))
        : 0;
    }

    // Calculate platform breakdown
    const platformData: Record<string, { count: number; totalRating: number }> = {};
    reviews.forEach(review => {
      if (!platformData[review.platform]) {
        platformData[review.platform] = { count: 0, totalRating: 0 };
      }
      platformData[review.platform].count++;
      platformData[review.platform].totalRating += review.rating;
    });

    const platformBreakdown = Object.entries(platformData).map(([platform, data]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      count: data.count,
      avgRating: parseFloat((data.totalRating / data.count).toFixed(1))
    }));

    // Calculate rating trends if requested
    let ratingTrends = undefined;
    if (includeTimeseries) {
      ratingTrends = calculateRatingTrends(reviews, days);
    }

    const stats = {
      avgRating,
      totalReviews,
      avgResponseTimeHours,
      replyRatePct,
      platformBreakdown,
      ratingTrends
    };

    return res.status(200).json(stats);

  } catch (error) {
    console.error('Review stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateRatingTrends(reviews: any[], windowDays: number) {
  const trends = [];
  const weeks = Math.ceil(windowDays / 7);
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (windowDays - (i * 7)));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekReviews = reviews.filter(review => {
      const reviewDate = new Date(review.created_at);
      return reviewDate >= weekStart && reviewDate < weekEnd;
    });

    const avgRating = weekReviews.length > 0 
      ? parseFloat((weekReviews.reduce((sum, r) => sum + r.rating, 0) / weekReviews.length).toFixed(1))
      : 0;

    trends.push({
      weekStart: weekStart.toISOString().split('T')[0],
      avgRating,
      count: weekReviews.length
    });
  }

  return trends.reverse(); // Most recent first
}
