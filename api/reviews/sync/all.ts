import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { business_id } = await request.json();
    
    if (!business_id) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    // Get all connected review sources for this business
    const { data: reviewSources, error: sourcesError } = await supabase
      .from('review_sources')
      .select('*')
      .eq('business_id', business_id)
      .eq('connected', true);

    if (sourcesError) {
      return NextResponse.json({ error: 'Failed to fetch review sources' }, { status: 500 });
    }

    if (!reviewSources || reviewSources.length === 0) {
      return NextResponse.json({ message: 'No connected review sources found', total: 0 });
    }

    const results = {
      total_sources: reviewSources.length,
      platforms: {} as Record<string, any>,
      summary: {
        total_inserted: 0,
        total_updated: 0,
        total_errors: 0
      }
    };

    // Sync each platform
    for (const source of reviewSources) {
      try {
        const platform = source.platform;
        const syncUrl = `/api/reviews/sync/${platform}`;
        
        // Call the platform-specific sync endpoint
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}${syncUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}` // Simple internal auth
          },
          body: JSON.stringify({ business_id })
        });

        if (response.ok) {
          const syncResult = await response.json();
          results.platforms[platform] = {
            success: true,
            ...syncResult
          };
          results.summary.total_inserted += syncResult.inserted || 0;
          results.summary.total_updated += syncResult.updated || 0;
        } else {
          const errorData = await response.json();
          results.platforms[platform] = {
            success: false,
            error: errorData.error || 'Sync failed'
          };
          results.summary.total_errors++;
        }
      } catch (error) {
        console.error(`Error syncing ${source.platform}:`, error);
        results.platforms[source.platform] = {
          success: false,
          error: 'Internal error during sync'
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for cron jobs
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get all businesses with connected review sources
    const { data: businesses, error: businessesError } = await supabase
      .from('review_sources')
      .select('business_id')
      .eq('connected', true)
      .distinct();

    if (businessesError) {
      return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ message: 'No businesses with connected review sources found' });
    }

    const results = {
      total_businesses: businesses.length,
      businesses: [] as any[]
    };

    // Sync each business
    for (const business of businesses) {
      try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/reviews/sync/all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
          },
          body: JSON.stringify({ business_id: business.business_id })
        });

        if (response.ok) {
          const businessResult = await response.json();
          results.businesses.push({
            business_id: business.business_id,
            success: true,
            ...businessResult
          });
        } else {
          results.businesses.push({
            business_id: business.business_id,
            success: false,
            error: 'Sync failed'
          });
        }
      } catch (error) {
        console.error(`Error syncing business ${business.business_id}:`, error);
        results.businesses.push({
          business_id: business.business_id,
          success: false,
          error: 'Internal error during sync'
        });
      }
    }

    return NextResponse.json({
      message: 'Cron sync completed for all businesses',
      ...results
    });

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
