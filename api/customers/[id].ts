import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser, getUserBusinessId } from '../../../src/lib/supabase-admin';
import { customerUpdateSchema } from '../../../src/lib/validation/customers';

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    const body = await request.json();
    const validatedData = customerUpdateSchema.parse(body);

    // Update customer (ensuring it belongs to user's business)
    const { data: customer, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(validatedData)
      .eq('id', params.id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    // Log to audit
    await supabaseAdmin
      .from('audit_log')
      .insert({
        business_id: businessId,
        user_id: user.id,
        entity: 'customers',
        entity_id: customer.id,
        action: 'update',
        details: { update_data: validatedData },
      });

    return NextResponse.json(customer);

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

// DELETE /api/customers/[id] - Soft delete customer (set status to archived)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    // Soft delete by setting status to archived
    const { data: customer, error: updateError } = await supabaseAdmin
      .from('customers')
      .update({ status: 'archived' })
      .eq('id', params.id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      console.error('Archive error:', updateError);
      return NextResponse.json({ error: 'Failed to archive customer' }, { status: 500 });
    }

    // Log to audit
    await supabaseAdmin
      .from('audit_log')
      .insert({
        business_id: businessId,
        user_id: user.id,
        entity: 'customers',
        entity_id: customer.id,
        action: 'archive',
        details: { previous_status: customer.status },
      });

    return NextResponse.json({ message: 'Customer archived successfully' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
