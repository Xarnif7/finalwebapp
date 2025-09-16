import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/browser';
import { ReviewStats } from '@/types/reviews';

interface UseReviewStatsProps {
  businessId: string;
  windowDays?: number;
}

export const useReviewStats = ({ businessId, windowDays = 30 }: UseReviewStatsProps) => {
  const [data, setData] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - windowDays);

      // Fetch reviews for the time period
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .gte('review_created_at', startDate.toISOString())
        .order('review_created_at', { ascending: true });

      if (reviewsError) throw reviewsError;

      // Fetch review replies for response time calculation
      const { data: replies, error: repliesError } = await supabase
        .from('review_replies')
        .select('*')
        .eq('business_id', businessId)
        .gte('replied_at', startDate.toISOString());

      if (repliesError && repliesError.code !== 'PGRST116') {
        // PGRST116 is "table doesn't exist" - we'll create it later
        throw repliesError;
      }

      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0 
        ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 0;
      
      const repliedReviews = reviews.filter(r => r.is_replied).length;
      const replyRatePct = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0;

      // Calculate average response time
      let avgResponseTimeHours = 0;
      if (replies && replies.length > 0) {
        const responseTimes = [];
        for (const reply of replies) {
          const review = reviews.find(r => r.id === reply.review_id);
          if (review) {
            const responseTime = new Date(reply.replied_at).getTime() - new Date(review.review_created_at).getTime();
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

      // Calculate rating trends (weekly buckets)
      const ratingTrends = calculateRatingTrends(reviews, windowDays);

      const stats: ReviewStats = {
        avgRating,
        totalReviews,
        avgResponseTimeHours,
        replyRatePct,
        platformBreakdown,
        ratingTrends
      };

      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch review stats');
    } finally {
      setLoading(false);
    }
  };

  const calculateRatingTrends = (reviews: any[], windowDays: number) => {
    const trends = [];
    const weeks = Math.ceil(windowDays / 7);
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (windowDays - (i * 7)));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekReviews = reviews.filter(review => {
        const reviewDate = new Date(review.review_created_at);
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
  };

  const refresh = () => {
    fetchStats();
  };

  useEffect(() => {
    if (businessId) {
      fetchStats();
    }
  }, [businessId, windowDays]);

  // Subscribe to changes in reviews and review_replies tables
  useEffect(() => {
    if (!businessId) return;

    const reviewsSubscription = supabase
      .channel('reviews-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reviews',
          filter: `business_id=eq.${businessId}`
        }, 
        () => {
          // Refresh stats when reviews change
          fetchStats();
        }
      )
      .subscribe();

    const repliesSubscription = supabase
      .channel('replies-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'review_replies',
          filter: `business_id=eq.${businessId}`
        }, 
        () => {
          // Refresh stats when replies change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsSubscription);
      supabase.removeChannel(repliesSubscription);
    };
  }, [businessId]);

  return { data, loading, error, refresh };
};
