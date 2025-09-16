import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';

export function useCustomersData(initialParams = {}) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 20,
    search: '',
    tag: '',
    sort: '',
    status: 'all',
    segment: 'all',
    ...initialParams,
  });

  const fetchCustomers = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's business_id from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      // Build query
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', profile.business_id);

      // Apply filters
      if (queryParams.status && queryParams.status !== 'all') {
        query = query.eq('status', queryParams.status);
      }

      if (queryParams.tag) {
        query = query.contains('tags', [queryParams.tag]);
      }

      if (queryParams.search) {
        // Use case-insensitive search across multiple fields
        const searchTerm = queryParams.search.toLowerCase();
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      // Segments
      if (queryParams.segment && queryParams.segment !== 'all') {
        const now = new Date();
        const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        if (queryParams.segment === 'new') {
          query = query.gte('created_at', last30);
        } else if (queryParams.segment === 'engaged') {
          // joined to review_requests by rpc is ideal; basic heuristic: has recent review_request completed
          // fallback: filter client-side after fetch if needed
        } else if (queryParams.segment === 'needs_nudge') {
          // will filter client-side after fetch if needed
        } else if (queryParams.segment === 'detractors') {
          // client-side flag based on private_feedback negative in last 30d if available
        }
      }

      // Apply sorting
      if (queryParams.sort) {
        const [field, order] = queryParams.sort.split(':');
        query = query.order(field, { ascending: order === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const from = (queryParams.page - 1) * queryParams.pageSize;
      const to = from + queryParams.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Customers query error:', error);
        throw new Error(error.message);
      }

      let list = data || [];
      if (queryParams.segment && queryParams.segment !== 'all') {
        if (queryParams.segment === 'engaged') {
          // Needs review_requests/completions; attempt heuristic via review_requests table
          const ids = list.map(c => c.id);
          if (ids.length) {
            const { data: reqs } = await supabase
              .from('review_requests')
              .select('customer_id, completed_at')
              .in('customer_id', ids);
            const engagedIds = new Set((reqs || []).filter(r => r.completed_at).map(r => r.customer_id));
            list = list.filter(c => engagedIds.has(c.id));
          }
        } else if (queryParams.segment === 'needs_nudge') {
          const ids = list.map(c => c.id);
          if (ids.length) {
            const { data: reqs } = await supabase
              .from('review_requests')
              .select('customer_id, opened_at, completed_at')
              .in('customer_id', ids);
            const needIds = new Set((reqs || []).filter(r => r.opened_at && !r.completed_at).map(r => r.customer_id));
            list = list.filter(c => needIds.has(c.id));
          }
        } else if (queryParams.segment === 'detractors') {
          const ids = list.map(c => c.id);
          if (ids.length) {
            const { data: pf } = await supabase
              .from('private_feedback')
              .select('review_request_id, sentiment, review_requests!inner(customer_id)')
              .in('review_requests.customer_id', ids);
            const detIds = new Set((pf || []).filter(p => p.sentiment === 'negative').map(p => p.review_requests.customer_id));
            list = list.filter(c => detIds.has(c.id));
          }
        }
      }

      setCustomers(list);
      setTotal(count || 0);

    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, queryParams]);

  const createCustomer = async (customerData) => {
    if (!user) throw new Error('No user');

    try {
      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      // Normalize data
      const normalizedData = {
        ...customerData,
        business_id: profile.business_id,
        created_by: user.id,
        email: customerData.email?.toLowerCase().trim() || null,
        phone: customerData.phone?.replace(/\D/g, '') || null, // digits only
        tags: Array.isArray(customerData.tags) ? customerData.tags : [],
      };

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert(normalizedData)
        .select()
        .single();

      if (error) {
        console.error('Create customer error:', error);
        throw new Error(error.message);
      }

      // Log to audit
      try {
        await supabase
          .from('audit_log')
          .insert({
            business_id: profile.business_id,
            user_id: user.id,
            entity: 'customers',
            entity_id: newCustomer.id,
            action: 'create',
            details: { customer_data: customerData },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Optimistic update
      setCustomers(prev => [newCustomer, ...prev]);
      setTotal(prev => prev + 1);
      
      return newCustomer;
    } catch (err) {
      console.error('Error creating customer:', err);
      throw err;
    }
  };

  const updateCustomer = async (id, updateData) => {
    if (!user) throw new Error('No user');

    try {
      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      // Normalize data
      const normalizedData = {
        ...updateData,
        email: updateData.email?.toLowerCase().trim() || null,
        phone: updateData.phone?.replace(/\D/g, '') || null, // digits only
        tags: Array.isArray(updateData.tags) ? updateData.tags : [],
      };

      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(normalizedData)
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .select()
        .single();

      if (error) {
        console.error('Update customer error:', error);
        throw new Error(error.message);
      }

      // Log to audit
      try {
        await supabase
          .from('audit_log')
          .insert({
            business_id: profile.business_id,
            user_id: user.id,
            entity: 'customers',
            entity_id: id,
            action: 'update',
            details: { update_data: updateData },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Optimistic update
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === id ? updatedCustomer : customer
        )
      );
      
      return updatedCustomer;
    } catch (err) {
      console.error('Error updating customer:', err);
      throw err;
    }
  };

  const archiveCustomer = async (id) => {
    if (!user) throw new Error('No user');

    try {
      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      const { data: archivedCustomer, error } = await supabase
        .from('customers')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .select()
        .single();

      if (error) {
        console.error('Archive customer error:', error);
        throw new Error(error.message);
      }

      // Log to audit
      try {
        await supabase
          .from('audit_log')
          .insert({
            business_id: profile.business_id,
            user_id: user.id,
            entity: 'customers',
            entity_id: id,
            action: 'archive',
            details: { previous_status: archivedCustomer.status },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Optimistic update
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === id ? archivedCustomer : customer
        )
      );
      
      return archivedCustomer;
    } catch (err) {
      console.error('Error archiving customer:', err);
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    if (!user) throw new Error('No user');

    try {
      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('business_id', profile.business_id);

      if (error) {
        console.error('Delete customer error:', error);
        throw new Error(error.message);
      }

      // Log to audit
      try {
        await supabase
          .from('audit_log')
          .insert({
            business_id: profile.business_id,
            user_id: user.id,
            entity: 'customers',
            entity_id: id,
            action: 'delete',
            details: { customer_deleted: true },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Optimistic update
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      setTotal(prev => prev - 1);
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting customer:', err);
      throw err;
    }
  };

  const importCsv = async (processedRows, progressCallback = null) => {
    if (!user) throw new Error('No user');

    try {
      // Get user's business_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      const results = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      const totalRows = processedRows.length;

      // Process each row with progress updates
      for (let i = 0; i < processedRows.length; i++) {
        const rowData = processedRows[i];
        
        try {
          // Validate required field
          if (!rowData.full_name) {
            throw new Error('Full name is required');
          }

          // Data is already normalized from the UI, just ensure business_id and created_by
          const customerData = {
            ...rowData,
            business_id: profile.business_id,
            created_by: user.id,
          };

          // Check if customer exists (by email or full_name + phone)
          let existingCustomer = null;
          if (customerData.email) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .eq('business_id', profile.business_id)
              .eq('email', customerData.email)
              .single();
            existingCustomer = data;
          }

          if (!existingCustomer && customerData.phone) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .eq('business_id', profile.business_id)
              .eq('full_name', customerData.full_name)
              .eq('phone', customerData.phone)
              .single();
            existingCustomer = data;
          }

          if (existingCustomer) {
            // Update existing customer
            await supabase
              .from('customers')
              .update(customerData)
              .eq('id', existingCustomer.id);
            
            results.updated++;
          } else {
            // Insert new customer
            await supabase
              .from('customers')
              .insert(customerData);
            
            results.inserted++;
          }

        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message,
            data: rowData
          });
          results.skipped++;
        }

        // Update progress
        if (progressCallback) {
          const progress = ((i + 1) / totalRows) * 100;
          progressCallback(progress);
        }
      }

      // Log import to audit
      try {
        await supabase
          .from('audit_log')
          .insert({
            business_id: profile.business_id,
            user_id: user.id,
            entity: 'customers',
            action: 'import_csv',
            details: { results, row_count: totalRows },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Refresh the customers list
      await fetchCustomers();
      
      return results;
    } catch (err) {
      console.error('Error importing CSV:', err);
      throw err;
    }
  };

  const updateQueryParams = useCallback((newParams) => {
    setQueryParams(prev => ({ ...prev, ...newParams, page: 1 }));
  }, []);

  const refresh = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    error,
    total,
    queryParams,
    updateQueryParams,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    deleteCustomer,
    importCsv,
    refresh,
  };
}
