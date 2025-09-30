import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

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
      .select('url, business_id')
      .eq('code', code)
      .single();

    if (qrError || !qrCode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrCode.url, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Set headers for download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-code-${code}.png"`);
    res.setHeader('Content-Length', qrBuffer.length);

    return res.send(qrBuffer);

  } catch (error) {
    console.error('Error generating QR code download:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
