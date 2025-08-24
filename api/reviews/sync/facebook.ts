import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface FacebookReview {
  id: string;
  recommendation_type: string;
  review_text?: string;
  rating?: number;
  created_time: string;
  reviewer: {
    name: string;
    id: string;
  };
  permalink_url?: string;
}

interface FacebookResponse {
  data: FacebookReview[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface SyncRequest {
  business_id: string;
  page_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, page_id }: SyncRequest = await request.json();
    
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Get the Facebook review source for this business
    const { data: reviewSource, error: sourceError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('platform', 'facebook')
      .eq('connected', true)
      .single();

    if (sourceError || !reviewSource) {
      return NextResponse.json(
        { error: 'No connected Facebook review source found' },
        { status: 404 }
      );
    }

    const targetPageId = page_id || reviewSource.external_id;
    const accessToken = reviewSource.access_token;
    
    if (!targetPageId) {
      return NextResponse.json(
        { error: 'No Facebook page ID provided or stored' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Facebook access token found' },
        { status: 400 }
      );
    }

    // Call Facebook Graph API for ratings/reviews
    const url = `https://graph.facebook.com/v18.0/${targetPageId}/ratings?fields=recommendation_type,review_text,rating,created_time,reviewer{name,id},permalink_url&access_token=${accessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Facebook Graph API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Facebook Graph API error: ${response.status}` },
        { status: 400 }
      );
    }

    const data: FacebookResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        message: 'No ratings/reviews found for this Facebook page',
        inserted: 0,
        updated: 0,
        total: 0
      });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process each rating/review
    for (const review of data.data) {
      try {
        // Skip if no review text (just ratings)
        if (!review.review_text) continue;

        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('business_id', business_id)
          .eq('platform', 'facebook')
          .eq('external_review_id', review.id)
          .single();

        // Convert Facebook recommendation_type to rating
        let rating = review.rating || 3; // Default to 3 if no rating
        if (review.recommendation_type === 'positive') {
          rating = 5;
        } else if (review.recommendation_type === 'negative') {
          rating = 1;
        }

        const reviewData = {
          business_id,
          platform: 'facebook',
          external_review_id: review.id,
          reviewer_name: review.reviewer.name,
          rating,
          text: review.review_text,
          review_url: review.permalink_url || `https://facebook.com/${targetPageId}`,
          review_created_at: new Date(review.created_time).toISOString(),
          sentiment: classifySentiment(review.review_text, rating)
        };

        if (existingReview) {
          // Update existing review
          const { error: updateError } = await supabase
            .from('reviews')
            .update(reviewData)
            .eq('id', existingReview.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Insert new review
          const { error: insertError } = await supabase
            .from('reviews')
            .insert(reviewData);

          if (insertError) throw insertError;
          inserted++;
        }
      } catch (error) {
        console.error('Error processing Facebook review:', error);
        errors++;
      }
    }

    // Update last_synced_at
    await supabase
      .from('review_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', reviewSource.id);

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        business_id,
        user_id: reviewSource.id, // Using review source ID as user context
        entity: 'reviews',
        action: 'sync',
        details: {
          platform: 'facebook',
          page_id: targetPageId,
          inserted,
          updated,
          errors,
          total_reviews: data.data.length,
          note: 'Facebook ratings/reviews sync'
        }
      });

    return NextResponse.json({
      message: 'Facebook reviews sync completed',
      inserted,
      updated,
      errors,
      total: data.data.length,
      note: 'Facebook ratings/reviews sync'
    });

  } catch (error) {
    console.error('Facebook sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function classifySentiment(text: string, rating: number): 'positive' | 'neutral' | 'negative' {
  // Simple sentiment classification based on rating and keywords
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  
  // Check for positive/negative keywords in text
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome', 'outstanding', 'superb'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor', 'disgusting', 'mediocre', 'lousy'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  
  return 'neutral';
}
