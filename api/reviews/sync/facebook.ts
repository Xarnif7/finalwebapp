import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface FacebookReview {
  id: string;
  rating: number;
  review_text?: string;
  created_time: string;
  reviewer: {
    name: string;
    id: string;
  };
}

interface FacebookResponse {
  data: FacebookReview[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id } = await request.json();
    
    if (!business_id) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Facebook review source not found or not connected' }, { status: 404 });
    }

    if (!reviewSource.access_token || !reviewSource.external_id) {
      return NextResponse.json({ error: 'Facebook access token or page ID not configured' }, { status: 400 });
    }

    // Call Facebook Graph API for page ratings/reviews
    const url = `https://graph.facebook.com/v18.0/${reviewSource.external_id}/ratings?access_token=${reviewSource.access_token}&fields=rating,review_text,created_time,reviewer{name,id}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Facebook API error: ${response.status} - ${errorText}` }, { status: 400 });
    }

    const data: FacebookResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ message: 'No Facebook reviews found', inserted: 0, updated: 0 });
    }

    let inserted = 0;
    let updated = 0;

    // Process each review
    for (const review of data.data) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('business_id', business_id)
          .eq('platform', 'facebook')
          .eq('external_review_id', review.id)
          .single();

        const reviewData = {
          business_id,
          platform: 'facebook',
          external_review_id: review.id,
          reviewer_name: review.reviewer.name,
          rating: review.rating,
          text: review.review_text || '',
          review_created_at: review.created_time,
          review_url: `https://facebook.com/${review.id}`,
          sentiment: classifySentiment(review.review_text || ''),
        };

        if (existingReview) {
          // Update existing review
          await supabase
            .from('reviews')
            .update(reviewData)
            .eq('id', existingReview.id);
          updated++;
        } else {
          // Insert new review
          await supabase
            .from('reviews')
            .insert(reviewData);
          inserted++;
        }
      } catch (error) {
        console.error('Error processing Facebook review:', error);
        // Continue with next review
      }
    }

    // Update last_synced_at
    await supabase
      .from('review_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', reviewSource.id);

    return NextResponse.json({
      message: 'Facebook reviews synced successfully',
      inserted,
      updated,
      total: inserted + updated
    });

  } catch (error) {
    console.error('Facebook sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simple sentiment classification
function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  if (!text) return 'neutral';
  
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome', 'outstanding'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor', 'unacceptable', 'frustrated'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}
