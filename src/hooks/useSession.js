import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/browser';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}
