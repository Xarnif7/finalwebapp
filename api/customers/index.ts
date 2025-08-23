import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser, getUserBusinessId } from '../../../src/lib/supabase-admin';
import { customerCreateSchema, customerQuerySchema } from '../../../src/lib/validation/customers';

// GET /api/customers - List customers with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = customerQuerySchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      tag: searchParams.get('tag'),
      sort: searchParams.get('sort'),
      status: searchParams.get('status'),
    });

    const { page, pageSize, search, tag, sort, status } = queryParams;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.textSearch('full_name,email,phone', search);
    }

    // Apply sorting
    if (sort) {
      const [field, order] = sort.split(':');
      query = query.order(field, { ascending: order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      customers: customers || [],
      total: count || 0,
      page,
      pageSize,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    const body = await request.json();
    const validatedData = customerCreateSchema.parse(body);

    // Insert customer
    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        ...validatedData,
        business_id: businessId,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Log to audit
    await supabaseAdmin
      .from('audit_log')
      .insert({
        business_id: businessId,
        user_id: user.id,
        entity: 'customers',
        entity_id: customer.id,
        action: 'create',
        details: { customer_data: validatedData },
      });

    return NextResponse.json(customer, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
