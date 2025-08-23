import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface YelpReview {
  id: string;
  url: string;
  text: string;
  rating: number;
  time_created: string;
  user: {
    name: string;
  };
}

interface YelpResponse {
  reviews: YelpReview[];
  total: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id } = await request.json();
    
    if (!business_id) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Get the Yelp review source for this business
    const { data: reviewSource, error: sourceError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('platform', 'yelp')
      .eq('connected', true)
      .single();

    if (sourceError || !reviewSource) {
      return NextResponse.json({ error: 'Yelp review source not found or not connected' }, { status: 404 });
    }

    if (!reviewSource.external_id) {
      return NextResponse.json({ error: 'Yelp Business ID not configured' }, { status: 400 });
    }

    // Call Yelp Fusion API
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Yelp API key not configured' }, { status: 500 });
    }

    const url = `https://api.yelp.com/v3/businesses/${reviewSource.external_id}/reviews`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Yelp API error: ${response.status} - ${errorText}` }, { status: 400 });
    }

    const data: YelpResponse = await response.json();

    if (!data.reviews || data.reviews.length === 0) {
      return NextResponse.json({ message: 'No Yelp reviews found', inserted: 0, updated: 0 });
    }

    let inserted = 0;
    let updated = 0;

    // Process each review (Yelp returns max 3 reviews)
    for (const review of data.reviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('business_id', business_id)
          .eq('platform', 'yelp')
          .eq('external_review_id', review.id)
          .single();

        const reviewData = {
          business_id,
          platform: 'yelp',
          external_review_id: review.id,
          reviewer_name: review.user.name,
          rating: review.rating,
          text: review.text,
          review_created_at: review.time_created,
          review_url: review.url,
          sentiment: classifySentiment(review.text),
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
        console.error('Error processing Yelp review:', error);
        // Continue with next review
      }
    }

    // Update last_synced_at
    await supabase
      .from('review_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', reviewSource.id);

    return NextResponse.json({
      message: 'Yelp reviews synced successfully',
      inserted,
      updated,
      total: inserted + updated,
      note: 'Yelp API returns maximum 3 reviews per call'
    });

  } catch (error) {
    console.error('Yelp sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simple sentiment classification
function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome', 'outstanding'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor', 'unacceptable', 'frustrated'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}
