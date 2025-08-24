import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface SyncRequest {
  business_id: string;
  internal_key?: string;
}

interface SyncResult {
  platform: string;
  success: boolean;
  inserted: number;
  updated: number;
  errors: number;
  total: number;
  error?: string;
  note?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id, internal_key }: SyncRequest = await request.json();
    
    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Verify internal key for cron/protected access
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (internal_key && expectedKey && internal_key !== expectedKey) {
      return NextResponse.json(
        { error: 'Invalid internal key' },
        { status: 401 }
      );
    }

    // Get all connected review sources for this business
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

    const results: SyncResult[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Sync each platform
    for (const source of reviewSources) {
      try {
        let platformResult: SyncResult;
        
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

        results.push(platformResult);
        totalInserted += platformResult.inserted;
        totalUpdated += platformResult.updated;
        totalErrors += platformResult.errors;

        // Update last_synced_at for this source
        await supabase
          .from('review_sources')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', source.id);

      } catch (error) {
        console.error(`Error syncing ${source.platform}:`, error);
        results.push({
          platform: source.platform,
          success: false,
          inserted: 0,
          updated: 0,
          errors: 1,
          total: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        totalErrors++;
      }
    }

    // Log to audit
    await supabase
      .from('audit_log')
      .insert({
        business_id,
        user_id: reviewSources[0].id, // Using first source ID as user context
        entity: 'reviews',
        action: 'sync_all',
        details: {
          platforms: reviewSources.map(s => s.platform),
          results,
          total_inserted: totalInserted,
          total_updated: totalUpdated,
          total_errors: totalErrors
        }
      });

    return NextResponse.json({
      message: 'All platform sync completed',
      summary: {
        total_inserted: totalInserted,
        total_updated: totalUpdated,
        total_errors: totalErrors,
        platforms_synced: reviewSources.map(s => s.platform)
      },
      details: results
    });

  } catch (error) {
    console.error('Master sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function syncGoogleReviews(source: any, business_id: string): Promise<SyncResult> {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/reviews/sync/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id, place_id: source.external_id })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      platform: 'google',
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
      total: result.total
    };
  } catch (error) {
    throw new Error(`Google sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncFacebookReviews(source: any, business_id: string): Promise<SyncResult> {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/reviews/sync/facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id, page_id: source.external_id })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      platform: 'facebook',
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
      total: result.total
    };
  } catch (error) {
    throw new Error(`Facebook sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncYelpReviews(source: any, business_id: string): Promise<SyncResult> {
  try {
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/reviews/sync/yelp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id, business_id_yelp: source.external_id })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      platform: 'yelp',
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
      total: result.total,
      note: result.note
    };
  } catch (error) {
    throw new Error(`Yelp sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
