import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../components/auth/AuthProvider';
import { toast } from 'sonner';

export function useMessageTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('/api/message-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(async (templateData) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('/api/message-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      const data = await response.json();
      setTemplates(prev => [data.template, ...prev]);
      return data.template;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId, templateData) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`/api/message-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update template');
      }

      const data = await response.json();
      setTemplates(prev => 
        prev.map(t => t.id === templateId ? data.template : t)
      );
      return data.template;
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`/api/message-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }, []);

  const duplicateTemplate = useCallback(async (templateId) => {
    try {
      const originalTemplate = templates.find(t => t.id === templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const duplicateData = {
        ...originalTemplate,
        name: `${originalTemplate.name} (Copy)`,
        id: undefined
      };

      return await createTemplate(duplicateData);
    } catch (err) {
      console.error('Error duplicating template:', err);
      throw err;
    }
  }, [templates, createTemplate]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refetch: fetchTemplates,
  };
}
