import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SyncAllRequest {
  business_id: string;
}

// Import sync functions from the main sync file
import { syncGoogleReviews, syncFacebookReviews, syncYelpReviews } from '../sync';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check for INTERNAL_API_KEY protection
    const internalKey = request.headers.get('x-internal-key') || 
                       new URL(request.url).searchParams.get('key');
    
    if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing internal key' },
        { status: 401 }
      );
    }

    const { business_id }: SyncAllRequest = await request.json();
    
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

    // Sync all platforms
    for (const source of reviewSources) {
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
