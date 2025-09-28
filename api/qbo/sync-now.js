import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ 
        error: 'Missing required field: business_id' 
      });
    }

    console.log(`[QBO] Manual sync requested for business ${business_id}`);

    // For now, return a simple success response
    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      records_found: 0,
      records_upserted: 0
    });

  } catch (error) {
    console.error('[QBO] Sync now error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}