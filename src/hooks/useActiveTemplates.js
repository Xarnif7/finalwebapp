import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useBusiness } from './useBusiness';

export const useActiveTemplates = () => {
  const [activeTemplates, setActiveTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { business } = useBusiness();

  useEffect(() => {
    const fetchActiveTemplates = async () => {
      if (!user?.email || !business?.id) {
        setActiveTemplates([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get templates from localStorage first (for persistence)
        const userEmail = user.email;
        const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const savedTemplates = JSON.parse(localStorage.getItem(localStorageKey) || '{}');
        const savedTemplatesArray = Object.values(savedTemplates);

        console.log('🔍 useActiveTemplates - Found templates:', savedTemplatesArray.length);
        console.log('🔍 useActiveTemplates - Template details:', savedTemplatesArray.map(t => ({
          name: t.name,
          status: t.status,
          trigger_type: t.trigger_type,
          channels: t.channels
        })));

        // Filter for active templates that can be manually triggered
        const manualTriggerTemplates = savedTemplatesArray.filter(template => 
          template.status === 'active' && 
          template.channels && Array.isArray(template.channels) && template.channels.includes('email')
        );

        console.log('🔍 useActiveTemplates - Active templates found:', manualTriggerTemplates.length);
        setActiveTemplates(manualTriggerTemplates);
        
        // If no localStorage templates, try to load from database
        if (manualTriggerTemplates.length === 0) {
          console.log('No active templates found in localStorage, checking database...');
          // Fallback to database loading would go here
        }

      } catch (err) {
        console.error('Error fetching active templates:', err);
        setError(err.message);
        setActiveTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTemplates();
  }, [user?.email, business?.id]);

  // Function to refresh templates
  const refreshTemplates = () => {
    const fetchActiveTemplates = async () => {
      if (!user?.email) return;

      try {
        const userEmail = user.email;
        const localStorageKey = `blipp_templates_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const savedTemplates = JSON.parse(localStorage.getItem(localStorageKey) || '{}');
        const savedTemplatesArray = Object.values(savedTemplates);

        const manualTriggerTemplates = savedTemplatesArray.filter(template => 
          template.status === 'active' && 
          template.channels && Array.isArray(template.channels) && template.channels.includes('email')
        );

        setActiveTemplates(manualTriggerTemplates);
      } catch (err) {
        console.error('Error refreshing templates:', err);
      }
    };

    fetchActiveTemplates();
  };

  return {
    activeTemplates,
    loading,
    error,
    refreshTemplates
  };
};
