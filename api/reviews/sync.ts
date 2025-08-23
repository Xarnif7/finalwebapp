import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SyncRequest {
  business_id: string;
  platform?: 'google' | 'facebook' | 'yelp' | 'all';
}

interface GooglePlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

interface GooglePlacesResponse {
  status: string;
  result?: {
    reviews?: GooglePlaceReview[];
  };
}

interface YelpReview {
  id: string;
  rating: number;
  text: string;
  time_created: string;
  url: string;
  user: {
    name: string;
  };
}

interface YelpResponse {
  reviews: YelpReview[];
}

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
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, platform = 'all' }: SyncRequest = await request.json();
    
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Get review sources for this business
    const { data: reviewSources, error: sourcesError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('connected', true);

    if (sourcesError) {
      console.error('Error fetching review sources:', sourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch review sources' },
        { status: 500 }
      );
    }

    if (!reviewSources || reviewSources.length === 0) {
      return NextResponse.json(
        { error: 'No connected review sources found' },
        { status: 404 }
      );
    }

    const results = {
      summary: {
        total_inserted: 0,
        total_updated: 0,
        total_errors: 0,
        platforms_synced: []
      },
      details: {}
    };

    // Filter by platform if specified
    const sourcesToSync = platform === 'all' 
      ? reviewSources 
      : reviewSources.filter(s => s.platform === platform);

    for (const source of sourcesToSync) {
      try {
        let platformResult;
        
        switch (source.platform) {
          case 'google':
            platformResult = await syncGoogleReviews(source, business_id);
            break;
          case 'facebook':
            platformResult = await syncFacebookReviews(source, business_id);
            break;
          case 'yelp':
            platformResult = await syncYelpReviews(source, business_id);
            break;
          default:
            console.warn(`Unknown platform: ${source.platform}`);
            continue;
        }

        results.details[source.platform] = platformResult;
        results.summary.total_inserted += platformResult.inserted;
        results.summary.total_updated += platformResult.updated;
        results.summary.total_errors += platformResult.errors;
        results.summary.platforms_synced.push(source.platform);

        // Update last_synced_at
        await supabase
          .from('review_sources')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', source.id);

      } catch (error) {
        console.error(`Error syncing ${source.platform}:`, error);
        results.details[source.platform] = {
          error: error.message,
          inserted: 0,
          updated: 0,
          errors: 1
        };
        results.summary.total_errors++;
      }
    }

    return NextResponse.json({
      message: 'Review sync completed',
      ...results
    });

  } catch (error) {
    console.error('Master sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function syncGoogleReviews(source: any, business_id: string) {
  if (source.connection_type !== 'places') {
    throw new Error('Only Google Places API is supported for now');
  }

  if (!source.external_id) {
    throw new Error('Google Place ID is required');
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${source.external_id}&fields=reviews&key=${apiKey}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data: GooglePlacesResponse = await response.json();
  
  if (data.status !== 'OK') {
    throw new Error(`Google API error: ${data.status}`);
  }

  if (!data.result?.reviews) {
    return { inserted: 0, updated: 0, errors: 0, total: 0 };
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const review of data.result.reviews) {
    try {
      const reviewData = {
        business_id,
        platform: 'google',
        external_review_id: review.time.toString(),
        reviewer_name: review.author_name,
        rating: review.rating,
        text: review.text,
        review_created_at: new Date(review.time * 1000).toISOString(),
        review_url: `https://maps.google.com/?cid=${source.external_id}`,
        sentiment: classifySentiment(review.text),
      };

      // Check if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('business_id', business_id)
        .eq('platform', 'google')
        .eq('external_review_id', review.time.toString())
        .single();

      if (existing) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', existing.id);
        
        if (error) throw error;
        updated++;
      } else {
        // Insert new review
        const { error } = await supabase
          .from('reviews')
          .insert(reviewData);
        
        if (error) throw error;
        inserted++;
      }
    } catch (error) {
      console.error('Error processing Google review:', error);
      errors++;
    }
  }

  return { inserted, updated, errors, total: inserted + updated };
}

async function syncYelpReviews(source: any, business_id: string) {
  if (!source.external_id) {
    throw new Error('Yelp Business ID is required');
  }

  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) {
    throw new Error('Yelp API key not configured');
  }

  const url = `https://api.yelp.com/v3/businesses/${source.external_id}/reviews`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Yelp API error: ${response.status}`);
  }

  const data: YelpResponse = await response.json();
  
  if (!data.reviews || data.reviews.length === 0) {
    return { inserted: 0, updated: 0, errors: 0, total: 0, note: 'No reviews found' };
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const review of data.reviews) {
    try {
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

      // Check if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('business_id', business_id)
        .eq('platform', 'yelp')
        .eq('external_review_id', review.id)
        .single();

      if (existing) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', existing.id);
        
        if (error) throw error;
        updated++;
      } else {
        // Insert new review
        const { error } = await supabase
          .from('reviews')
          .insert(reviewData);
        
        if (error) throw error;
        inserted++;
      }
    } catch (error) {
      console.error('Error processing Yelp review:', error);
      errors++;
    }
  }

  return { inserted, updated, errors, total: inserted + updated, note: 'Yelp API returns maximum 3 reviews per call' };
}

async function syncFacebookReviews(source: any, business_id: string) {
  if (!source.access_token || !source.external_id) {
    throw new Error('Facebook access token and page ID are required');
  }

  const url = `https://graph.facebook.com/v18.0/${source.external_id}/ratings?access_token=${source.access_token}&fields=rating,review_text,created_time,reviewer{name,id}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.status}`);
  }

  const data: FacebookResponse = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return { inserted: 0, updated: 0, errors: 0, total: 0, note: 'No reviews found' };
  }

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const review of data.data) {
    try {
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

      // Check if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('business_id', business_id)
        .eq('platform', 'facebook')
        .eq('external_review_id', review.id)
        .single();

      if (existing) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', existing.id);
        
        if (error) throw error;
        updated++;
      } else {
        // Insert new review
        const { error } = await supabase
          .from('reviews')
          .insert(reviewData);
        
        if (error) throw error;
        inserted++;
      }
    } catch (error) {
      console.error('Error processing Facebook review:', error);
      errors++;
    }
  }

  return { inserted, updated, errors, total: inserted + updated };
}

function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  if (!text) return 'neutral';
  
  const lowerText = text.toLowerCase();
  
  // Positive keywords
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding', 'perfect', 'love', 'awesome', 'best', 'good', 'nice', 'happy', 'satisfied', 'pleased'];
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  
  // Negative keywords
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'bad', 'poor', 'disappointing', 'hate', 'terrible', 'awful', 'horrible', 'worst', 'bad', 'poor', 'disappointing'];
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}
