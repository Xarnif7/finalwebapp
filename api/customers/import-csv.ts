import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser, getUserBusinessId } from '../../../src/lib/supabase-admin';
import { csvRowSchema } from '../../../src/lib/validation/customers';

// POST /api/customers/import-csv - Import customers from CSV
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAuthenticatedUser(authHeader);
    const businessId = await getUserBusinessId(user.id);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read and parse CSV
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    if (!headers.includes('full_name')) {
      return NextResponse.json({ error: 'CSV must include full_name column' }, { status: 400 });
    }

    const results = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const values = line.split(',').map(v => v.trim());
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            rowData[header] = values[index];
          }
        });

        // Validate row data
        const validatedData = csvRowSchema.parse(rowData);
        
        // Normalize data
        const normalizedData = {
          full_name: validatedData.full_name.trim(),
          email: validatedData.email?.toLowerCase().trim() || null,
          phone: validatedData.phone?.trim() || null,
          service_date: validatedData.service_date || null,
          tags: validatedData.tags ? validatedData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          notes: validatedData.notes?.trim() || null,
          status: validatedData.status || 'active',
        };

        // Check if customer exists (by email or full_name + phone)
        let existingCustomer = null;
        if (normalizedData.email) {
          const { data } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('email', normalizedData.email)
            .single();
          existingCustomer = data;
        }

        if (!existingCustomer && normalizedData.phone) {
          const { data } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('business_id', businessId)
            .eq('full_name', normalizedData.full_name)
            .eq('phone', normalizedData.phone)
            .single();
          existingCustomer = data;
        }

        if (existingCustomer) {
          // Update existing customer
          await supabaseAdmin
            .from('customers')
            .update(normalizedData)
            .eq('id', existingCustomer.id);
          
          results.updated++;
        } else {
          // Insert new customer
          await supabaseAdmin
            .from('customers')
            .insert({
              ...normalizedData,
              business_id: businessId,
              created_by: user.id,
            });
          
          results.inserted++;
        }

      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: lines[i]
        });
        results.skipped++;
      }
    }

    // Log import to audit
    await supabaseAdmin
      .from('audit_log')
      .insert({
        business_id: businessId,
        user_id: user.id,
        entity: 'customers',
        action: 'import_csv',
        details: { results, filename: file.name },
      });

    return NextResponse.json(results);

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
