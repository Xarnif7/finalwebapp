import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify internal key for cron access
    const internalKey = request.headers.get('x-internal-key');
    const expectedKey = process.env.INTERNAL_API_KEY;
    
    if (!internalKey || !expectedKey || internalKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all businesses with connected review sources
    const { data: reviewSources, error: sourcesError } = await supabase
      .from('review_sources')
      .select('business_id')
      .eq('connected', true);

    if (sourcesError) {
      console.error('Error fetching review sources for cron:', sourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch review sources' },
        { status: 500 }
      );
    }

    if (!reviewSources || reviewSources.length === 0) {
      return NextResponse.json({
        message: 'No connected review sources found',
        businesses_synced: 0
      });
    }

    // Get unique business IDs
    const businessIds = [...new Set(reviewSources.map(s => s.business_id))];
    const results = [];

    // Sync each business
    for (const businessId of businessIds) {
      try {
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/reviews/sync/all`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-internal-key': expectedKey
          },
          body: JSON.stringify({ 
            business_id: businessId,
            internal_key: expectedKey
          })
        });

        if (response.ok) {
          const result = await response.json();
          results.push({
            business_id: businessId,
            success: true,
            summary: result.summary
          });
        } else {
          const errorData = await response.json();
          results.push({
            business_id: businessId,
            success: false,
            error: errorData.error
          });
        }
      } catch (error) {
        console.error(`Cron sync error for business ${businessId}:`, error);
        results.push({
          business_id: businessId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log cron execution to audit
    const totalBusinesses = businessIds.length;
    const successfulSyncs = results.filter(r => r.success).length;
    const failedSyncs = totalBusinesses - successfulSyncs;

    await supabase
      .from('audit_log')
      .insert({
        business_id: businessIds[0], // Using first business ID as context
        user_id: 'cron', // Special identifier for cron jobs
        entity: 'reviews',
        action: 'cron_sync',
        details: {
          total_businesses: totalBusinesses,
          successful_syncs: successfulSyncs,
          failed_syncs: failedSyncs,
          results,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      message: 'Cron sync completed',
      total_businesses: totalBusinesses,
      successful_syncs: successfulSyncs,
      failed_syncs: failedSyncs,
      results
    });

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
