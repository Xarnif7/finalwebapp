import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tech_id } = req.body;

    // Get user from JWT token
    const authHeader = req.headers.authorization;
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

    // If tech_id provided, verify it belongs to the business
    if (tech_id) {
      const { data: tech, error: techError } = await supabase
        .from('techs')
        .select('id, name')
        .eq('id', tech_id)
        .eq('business_id', profile.business_id)
        .single();

      if (techError || !tech) {
        return res.status(404).json({ error: 'Tech not found' });
      }
    }

    // Generate unique QR code
    const { data: qrCode, error: qrError } = await supabase
      .rpc('generate_qr_code');

    if (qrError) {
      console.error('Error generating QR code:', qrError);
      return res.status(500).json({ error: 'Failed to generate QR code' });
    }

    // Create QR code record
    const url = `${process.env.APP_BASE_URL}/r/${qrCode}`;
    
    const { data: qrRecord, error: insertError } = await supabase
      .from('qr_codes')
      .insert({
        business_id: profile.business_id,
        tech_id: tech_id || null,
        code: qrCode,
        url: url
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating QR code record:', insertError);
      return res.status(500).json({ error: 'Failed to create QR code record' });
    }

    // Log telemetry event
    await supabase.rpc('log_telemetry_event', {
      p_business_id: profile.business_id,
      p_event_type: 'qr_code_created',
      p_event_data: {
        qr_code_id: qrRecord.id,
        tech_id: tech_id,
        code: qrCode
      }
    });

    return res.status(200).json({
      success: true,
      message: 'QR code created successfully',
      qr_code: {
        id: qrRecord.id,
        code: qrCode,
        url: url,
        tech_id: tech_id,
        created_at: qrRecord.created_at
      },
      download_url: `${process.env.APP_BASE_URL}/api/qr/download/${qrCode}`,
      png_url: `${process.env.APP_BASE_URL}/api/qr/png/${qrCode}`
    });

  } catch (error) {
    console.error('Error in QR create endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
