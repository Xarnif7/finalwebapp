import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SyncRequest {
  business_id: string;
  platform?: string;
}

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
  try {
    const targetPlaceId = source.external_id;
    
    if (!targetPlaceId) {
      return { error: 'No place_id stored', inserted: 0, updated: 0, errors: 1 };
    }

    // Call Google Places API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { error: 'Google Places API key not configured', inserted: 0, updated: 0, errors: 1 };
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${targetPlaceId}&fields=reviews,place_id&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data: GooglePlacesResponse = await response.json();
    
    if (data.status !== 'OK') {
      return { error: `Google Places API error: ${data.status}`, inserted: 0, updated: 0, errors: 1 };
    }

    if (!data.result.reviews || data.result.reviews.length === 0) {
      return { message: 'No reviews found for this place', inserted: 0, updated: 0, total: 0 };
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
        console.error('Error processing Google review:', error);
        errors++;
      }
    }

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        business_id,
        user_id: source.id,
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

    return {
      inserted,
      updated,
      errors,
      total: data.result.reviews.length
    };

  } catch (error) {
    throw new Error(`Google sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncYelpReviews(source: any, business_id: string) {
  try {
    const targetBusinessId = source.external_id;
    
    if (!targetBusinessId) {
      return { error: 'No Yelp business ID stored', inserted: 0, updated: 0, errors: 1 };
    }

    // Call Yelp Fusion API
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return { error: 'Yelp API key not configured', inserted: 0, updated: 0, errors: 1 };
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
      return { error: `Yelp API error: ${response.status}`, inserted: 0, updated: 0, errors: 1 };
    }

    const data: YelpResponse = await response.json();
    
    if (!data.reviews || data.reviews.length === 0) {
      return { message: 'No reviews found for this Yelp business', inserted: 0, updated: 0, total: 0 };
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

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        business_id,
        user_id: source.id,
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

    return {
      inserted,
      updated,
      errors,
      total: data.reviews.length,
      note: 'Yelp Fusion API returns max 3 reviews per call'
    };

  } catch (error) {
    throw new Error(`Yelp sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncFacebookReviews(source: any, business_id: string) {
  try {
    const targetPageId = source.external_id;
    const accessToken = source.access_token;
    
    if (!targetPageId) {
      return { error: 'No Facebook page ID stored', inserted: 0, updated: 0, errors: 1 };
    }

    if (!accessToken) {
      return { error: 'No Facebook access token found', inserted: 0, updated: 0, errors: 1 };
    }

    // Call Facebook Graph API for ratings/reviews
    const url = `https://graph.facebook.com/v18.0/${targetPageId}/ratings?fields=recommendation_type,review_text,rating,created_time,reviewer{name,id},permalink_url&access_token=${accessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Facebook Graph API error:', response.status, errorText);
      return { error: `Facebook Graph API error: ${response.status}`, inserted: 0, updated: 0, errors: 1 };
    }

    const data: FacebookResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return { message: 'No ratings/reviews found for this Facebook page', inserted: 0, updated: 0, total: 0 };
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

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        business_id,
        user_id: source.id,
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

    return {
      inserted,
      updated,
      errors,
      total: data.data.length,
      note: 'Facebook ratings/reviews sync'
    };

  } catch (error) {
    throw new Error(`Facebook sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function classifySentiment(text: string, rating: number): 'positive' | 'neutral' | 'negative' {
  // Simple sentiment classification based on rating and keywords
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  
  // Check for positive/negative keywords in text
  const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome', 'outstanding', 'superb', 'delicious'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'bad', 'poor', 'disgusting', 'mediocre', 'lousy', 'overpriced'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  
  return 'neutral';
}
