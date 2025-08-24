import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface GooglePlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

interface GooglePlacesResponse {
  status: string;
  result: {
    reviews?: GooglePlaceReview[];
    place_id: string;
  };
}

interface SyncRequest {
  business_id: string;
  place_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, place_id }: SyncRequest = await request.json();
    
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Get the Google review source for this business
    const { data: reviewSource, error: sourceError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('platform', 'google')
      .eq('connected', true)
      .single();

    if (sourceError || !reviewSource) {
      return NextResponse.json(
        { error: 'No connected Google review source found' },
        { status: 404 }
      );
    }

    const targetPlaceId = place_id || reviewSource.external_id;
    
    if (!targetPlaceId) {
      return NextResponse.json(
        { error: 'No place_id provided or stored' },
        { status: 400 }
      );
    }

    // Call Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${targetPlaceId}&fields=reviews,place_id&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data: GooglePlacesResponse = await response.json();
    
    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 400 }
      );
    }

    if (!data.result.reviews || data.result.reviews.length === 0) {
      return NextResponse.json({
        message: 'No reviews found for this place',
        inserted: 0,
        updated: 0,
        total: 0
      });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process each review
    for (const review of data.result.reviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('business_id', business_id)
          .eq('platform', 'google')
          .eq('external_review_id', `${targetPlaceId}_${review.time}`)
          .single();

        const reviewData = {
          business_id,
          platform: 'google',
          external_review_id: `${targetPlaceId}_${review.time}`,
          reviewer_name: review.author_name,
          rating: review.rating,
          text: review.text,
          review_url: `https://maps.google.com/?cid=${targetPlaceId}`,
          review_created_at: new Date(review.time * 1000).toISOString(),
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
        console.error('Error processing review:', error);
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
          platform: 'google',
          place_id: targetPlaceId,
          inserted,
          updated,
          errors,
          total_reviews: data.result.reviews.length
        }
      });

    return NextResponse.json({
      message: 'Google reviews sync completed',
      inserted,
      updated,
      errors,
      total: data.result.reviews.length
    });

  } catch (error) {
    console.error('Google sync error:', error);
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
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  
  return 'neutral';
}
