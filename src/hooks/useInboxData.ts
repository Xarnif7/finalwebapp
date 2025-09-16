import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/browser';

export function useInboxThreads() {
  return useQuery({
    queryKey: ['inbox-threads'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .single();
      if (!profile?.business_id) return [] as any[];

      const { data, error } = await supabase.rpc('inbox_threads', {
        p_business_id: profile.business_id,
      });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useInboxCounts() {
  return useQuery({
    queryKey: ['inbox-counts'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .single();
      if (!profile?.business_id) return { sent: 0, opened: 0, clicked: 0, completed: 0 };

      const { data, error } = await supabase.rpc('inbox_counts', {
        p_business_id: profile.business_id,
      });
      if (error) throw error;
      return data as { sent: number; opened: number; clicked: number; completed: number };
    },
  });
}


