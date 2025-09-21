import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { supabase } from '../lib/supabase/browser';
import { apiClient } from '../lib/apiClient';

export const useTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  const fetchTemplates = async () => {
    if (!businessId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/templates/${businessId}`);
      
      if (response.success) {
        setTemplates(response.templates);
      } else {
        setError('Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateStatus = async (templateId, status) => {
    try {
      const response = await apiClient.put(`/api/templates/${templateId}/status`, { status });
      
      if (response.success) {
        // Update the template in the local state
        setTemplates(prev => 
          prev.map(template => 
            template.id === templateId 
              ? { ...template, status: status, updated_at: new Date().toISOString() }
              : template
          )
        );
        return { success: true, template: response.template };
      } else {
        throw new Error(response.error || 'Failed to update template status');
      }
    } catch (err) {
      console.error('Error updating template status:', err);
      throw err;
    }
  };

  const provisionDefaultTemplates = async () => {
    try {
      const response = await apiClient.post('/api/templates/provision-defaults', { 
        business_id: businessId 
      });
      
      if (response.success) {
        // Refresh templates after provisioning
        await fetchTemplates();
        return { success: true, templates: response.templates };
      } else {
        throw new Error(response.error || 'Failed to provision default templates');
      }
    } catch (err) {
      console.error('Error provisioning default templates:', err);
      throw err;
    }
  };

  // Get business_id from user profile
  useEffect(() => {
    const getBusinessId = async () => {
      if (!user) {
        setBusinessId(null);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Unable to load user profile');
          return;
        }

        if (!profile?.business_id) {
          setError('Business not found. Please complete onboarding first.');
          return;
        }

        setBusinessId(profile.business_id);
      } catch (err) {
        console.error('Error getting business ID:', err);
        setError('Failed to load business information');
      }
    };

    getBusinessId();
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [businessId]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    updateTemplateStatus,
    provisionDefaultTemplates
  };
};
