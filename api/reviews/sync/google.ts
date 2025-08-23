import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface GooglePlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url?: string;
}

interface GooglePlacesResponse {
  result: {
    reviews?: GooglePlaceReview[];
    place_id: string;
  };
  status: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id } = await request.json();
    
    if (!business_id) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Google review source not found or not connected' }, { status: 404 });
    }

    if (reviewSource.connection_type !== 'places') {
      return NextResponse.json({ error: 'Only Google Places API is supported in MVP' }, { status: 400 });
    }

    if (!reviewSource.external_id) {
      return NextResponse.json({ error: 'Google Place ID not configured' }, { status: 400 });
    }

    // Call Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${reviewSource.external_id}&fields=reviews&key=${apiKey}`;
    
    const response = await fetch(url);
    const data: GooglePlacesResponse = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ error: `Google Places API error: ${data.status}` }, { status: 400 });
    }

    if (!data.result.reviews || data.result.reviews.length === 0) {
      return NextResponse.json({ message: 'No reviews found', inserted: 0, updated: 0 });
    }

    let inserted = 0;
    let updated = 0;

    // Process each review
    for (const review of data.result.reviews) {
      try {
        // Check if review already exists
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('business_id', business_id)
          .eq('platform', 'google')
          .eq('external_review_id', review.time.toString())
          .single();

        const reviewData = {
          business_id,
          platform: 'google',
          external_review_id: review.time.toString(),
          reviewer_name: review.author_name,
          rating: review.rating,
          text: review.text,
          review_created_at: new Date(review.time * 1000).toISOString(),
          review_url: `https://maps.google.com/?cid=${reviewSource.external_id}`,
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
        console.error('Error processing review:', error);
        // Continue with next review
      }
    }

    // Update last_synced_at
    await supabase
      .from('review_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', reviewSource.id);

    return NextResponse.json({
      message: 'Google reviews synced successfully',
      inserted,
      updated,
      total: inserted + updated
    });

  } catch (error) {
    console.error('Google sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simple sentiment classification (can be enhanced with AI later)
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
