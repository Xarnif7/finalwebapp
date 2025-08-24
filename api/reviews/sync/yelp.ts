import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface YelpReview {
  id: string;
  url: string;
  text: string;
  rating: number;
  time_created: string;
  user: {
    id: string;
    profile_url: string;
    image_url: string;
    name: string;
  };
}

interface YelpResponse {
  reviews: YelpReview[];
  total: number;
  possible_languages: string[];
}

interface SyncRequest {
  business_id: string;
  business_id_yelp?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, business_id_yelp }: SyncRequest = await request.json();
    
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'No connected Yelp review source found' },
        { status: 404 }
      );
    }

    const targetBusinessId = business_id_yelp || reviewSource.external_id;
    
    if (!targetBusinessId) {
      return NextResponse.json(
        { error: 'No Yelp business ID provided or stored' },
        { status: 400 }
      );
    }

    // Call Yelp Fusion API
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Yelp API key not configured' },
        { status: 500 }
      );
    }

    const url = `https://api.yelp.com/v3/businesses/${targetBusinessId}/reviews`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Yelp API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Yelp API error: ${response.status}` },
        { status: 400 }
      );
    }

    const data: YelpResponse = await response.json();
    
    if (!data.reviews || data.reviews.length === 0) {
      return NextResponse.json({
        message: 'No reviews found for this Yelp business',
        inserted: 0,
        updated: 0,
        total: 0
      });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

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
          review_url: review.url,
          review_created_at: new Date(review.time_created).toISOString(),
          sentiment: classifySentiment(review.text, review.rating)
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
        console.error('Error processing Yelp review:', error);
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
          platform: 'yelp',
          yelp_business_id: targetBusinessId,
          inserted,
          updated,
          errors,
          total_reviews: data.reviews.length,
          note: 'Yelp Fusion API returns max 3 reviews per call'
        }
      });

    return NextResponse.json({
      message: 'Yelp reviews sync completed',
      inserted,
      updated,
      errors,
      total: data.reviews.length,
      note: 'Yelp Fusion API returns max 3 reviews per call'
    });

  } catch (error) {
    console.error('Yelp sync error:', error);
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
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'delicious', 'amazing', 'outstanding'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor', 'disgusting', 'mediocre', 'overpriced'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  
  return 'neutral';
}
