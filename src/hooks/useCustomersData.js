import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';

export function useCustomersData(initialParams = {}) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    pageSize: 1000, // Increased to handle large customer lists
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

      // Get user's business_id from profiles, with email-based fallback
      let businessId = null;
      
      // First try: Get from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profileError && profile?.business_id) {
        businessId = profile.business_id;
        console.log('📋 Using business_id from profile:', businessId);
      } else {
        // Fallback: Find business by email
        console.log('📋 Profile business_id not found, trying email-based lookup for:', user.email);
        
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('created_by', user.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!businessError && business) {
          businessId = business.id;
          console.log('📋 Found business by email:', businessId);
          
          // Update profile to point to this business
          await supabase
            .from('profiles')
            .update({ business_id: businessId })
            .eq('id', user.id);
        }
      }

      if (!businessId) {
        throw new Error('Business not found. Please complete onboarding first.');
      }

      // Build query
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

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

      // Skip pagination for customer list - we want ALL customers
      // Pagination is handled at the UI level with virtual scrolling if needed
      // query = query.range(from, to); // Commented out to fetch all customers

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

      console.log('📋 Loaded customers from database:', {
        count: list?.length || 0,
        total: count || 0,
        business_id: businessId,
        customers: list?.map(c => ({ id: c.id, name: c.full_name, email: c.email })) || []
      });

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
        console.error('Profile error:', profileError);
        throw new Error('Unable to load user profile. Please try logging out and back in.');
      }

      if (!profile?.business_id) {
        console.error('No business_id found for user:', user.id);
        throw new Error('Business not found. Please complete onboarding first.');
      }

      console.log('Using business_id:', profile.business_id);

      // Verify business exists, create if missing
      let { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', profile.business_id)
        .single();

      if (businessError || !business) {
        console.log('Business not found, creating new business for user:', user.id);
        
        // Create the missing business
        const { data: newBusiness, error: createError } = await supabase
          .from('businesses')
          .insert({
            id: profile.business_id, // Use the existing business_id from profile
            name: `${user.email?.split('@')[0] || 'User'}'s Business`,
            created_by: user.id
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating business:', createError);
          throw new Error('Failed to create business. Please contact support.');
        }

        business = newBusiness;
        console.log('Created business:', business);
      }

      // Normalize data
      const normalizedData = {
        ...customerData,
        business_id: profile.business_id,
        created_by: user.id,
        email: customerData.email?.toLowerCase().trim() || null,
        phone: customerData.phone?.replace(/\D/g, '') || null, // digits only
        service_date: customerData.service_date?.trim() || null, // Convert empty string to null
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

      console.log('✅ Customer saved to database:', {
        id: newCustomer.id,
        name: newCustomer.full_name,
        email: newCustomer.email,
        business_id: newCustomer.business_id,
        created_at: newCustomer.created_at
      });

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
        service_date: updateData.service_date?.trim() || null, // Convert empty string to null
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

  const unarchiveCustomer = async (id) => {
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

      const { data: unarchivedCustomer, error } = await supabase
        .from('customers')
        .update({ status: 'active' })
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .select()
        .single();

      if (error) {
        console.error('Unarchive customer error:', error);
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
            action: 'unarchive',
            details: { previous_status: 'archived' },
          });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // Don't fail the operation if audit logging fails
      }

      // Optimistic update
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === id ? unarchivedCustomer : customer
        )
      );
      
      return unarchivedCustomer;
    } catch (err) {
      console.error('Error unarchiving customer:', err);
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

      // IMPORTANT: Delete related records first to avoid foreign key constraint violations
      console.log('🧹 Cleaning up related records for customer:', id);
      
      // Delete review requests
      const { error: deleteRequestsError } = await supabase
        .from('review_requests')
        .delete()
        .eq('customer_id', id);
      
      if (deleteRequestsError) {
        console.warn('⚠️ Could not delete review requests:', deleteRequestsError.message);
        // Don't fail the entire operation if review requests can't be deleted
      } else {
        console.log('✅ Review requests deleted');
      }
      
      // Delete scheduled jobs related to this customer
      const { error: deleteJobsError } = await supabase
        .from('scheduled_jobs')
        .delete()
        .eq('payload->customer_id', id);
      
      if (deleteJobsError) {
        console.warn('⚠️ Could not delete scheduled jobs:', deleteJobsError.message);
      } else {
        console.log('✅ Scheduled jobs deleted');
      }
      
      // Delete automation executions related to this customer
      const { error: deleteExecutionsError } = await supabase
        .from('automation_executions')
        .delete()
        .eq('customer_id', id);
      
      if (deleteExecutionsError) {
        console.warn('⚠️ Could not delete automation executions:', deleteExecutionsError.message);
      } else {
        console.log('✅ Automation executions deleted');
      }

      // Now delete the customer
      console.log('🗑️ Deleting customer record...');
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('business_id', profile.business_id);

      if (error) {
        console.error('Delete customer error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Customer deleted successfully');

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

  const importCsv = async (processedRows, progressCallback = null, autoEnrollParams = null) => {
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

      // Use the new API endpoint that handles auto-enrollment
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/csv/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          customers: processedRows,
          filename: 'import.csv',
          autoEnroll: autoEnrollParams
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      
      // Update progress to 100% if callback provided
      if (progressCallback) {
        progressCallback(100);
      }

      // Refresh the customers list
      await fetchCustomers();
      
      return {
        inserted: result.customers_imported,
        updated: 0, // API doesn't return updated count
        skipped: 0, // API doesn't return skipped count
        errors: [],
        enrollmentSummary: result.enrollmentSummary
      };
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
    unarchiveCustomer,
    deleteCustomer,
    importCsv,
    refresh,
  };
}
