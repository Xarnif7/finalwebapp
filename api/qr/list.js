import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
    const authHeader = headers().get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's business_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return res.status(400).json({ error: 'User not associated with a business' });
    }

    // Get QR codes for the business
    const { data: qrCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select(`
        *,
        techs(id, name, role)
      `)
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false });

    if (qrError) {
      console.error('Error fetching QR codes:', qrError);
      return res.status(500).json({ error: 'Failed to fetch QR codes' });
    }

    // Add download URLs to each QR code
    const qrCodesWithUrls = qrCodes.map(qr => ({
      ...qr,
      download_url: `${process.env.APP_BASE_URL}/api/qr/download/${qr.code}`,
      png_url: `${process.env.APP_BASE_URL}/api/qr/png/${qr.code}`
    }));

    return res.status(200).json({
      success: true,
      qr_codes: qrCodesWithUrls
    });

  } catch (error) {
    console.error('Error in QR list endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
