import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser, getUserBusinessId } from '../../../src/lib/supabase-admin';

// GET /api/customers/stats - Get customer statistics for KPI cards
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    // Get total customers
    const { count: totalCustomers, error: totalError } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active');

    if (totalError) {
      console.error('Total customers error:', totalError);
      return NextResponse.json({ error: 'Failed to get total customers' }, { status: 500 });
    }

    // Get new customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth, error: newMonthError } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active')
      .gte('created_at', startOfMonth.toISOString());

    if (newMonthError) {
      console.error('New month customers error:', newMonthError);
      return NextResponse.json({ error: 'Failed to get new month customers' }, { status: 500 });
    }

    // For now, conversion rate is null (as specified in requirements)
    // This can be calculated later based on business logic
    const conversionRate = null;

    const stats = {
      total_customers: totalCustomers || 0,
      new_this_month: newThisMonth || 0,
      conversion_rate: conversionRate,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
