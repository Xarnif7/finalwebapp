import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[API] Profile creation auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'Missing business_id' });
    }

    console.log(`[API] Creating profile for user ${user.id} with business_id ${business_id}`);

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        user_id: user.id, // Ensure user_id is also set
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        business_id: business_id,
        role: 'owner',
        onboarding_completed: false // Set to false initially
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating profile:', error);
      return res.status(500).json({ error: 'Failed to create profile', details: error.message });
    }

    console.log('[API] Profile created successfully:', profile);
    return res.status(201).json({ success: true, profile });

  } catch (e) {
    console.error('[API] Unexpected error in profile creation:', e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}