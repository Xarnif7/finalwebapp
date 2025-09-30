import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    // Get QR code details from database
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('url, business_id, scans_count')
      .eq('code', code)
      .single();

    if (qrError || !qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Increment scan count
    await supabase
      .from('qr_codes')
      .update({ 
        scans_count: (qrCode.scans_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('code', code);

    // Get business details to build the feedback form URL
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', qrCode.business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Redirect to the feedback form for this business
    const feedbackFormUrl = `${process.env.APP_BASE_URL}/feedback-form/${business.id}`;
    
    // Return a redirect response
    res.redirect(302, feedbackFormUrl);

  } catch (error) {
    console.error('Error processing QR code redirect:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
