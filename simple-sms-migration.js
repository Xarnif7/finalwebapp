import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSimpleSMSMigration() {
  try {
    console.log('🚀 Running simple SMS migration...');
    
    // First, let's check the current business structure
    const { data: businesses, error: checkError } = await supabase
      .from('businesses')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking businesses:', checkError);
      return;
    }

    console.log('📊 Current business structure:', Object.keys(businesses[0] || {}));

    // Try to update a specific business with SMS fields
    const { data: updateData, error: updateError } = await supabase
      .from('businesses')
      .update({ 
        from_number: '+18775402797',
        verification_status: 'active',
        sms_enabled: true
      })
      .eq('id', '674fedc5-7937-4054-bffd-e4ecc22abc1d')
      .select();

    if (updateError) {
      console.error('❌ Error updating business:', updateError);
      console.log('💡 This suggests the SMS columns need to be added via Supabase SQL editor');
      console.log('📝 Please run this SQL in your Supabase SQL editor:');
      console.log(`
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS from_number TEXT,
        ADD COLUMN IF NOT EXISTS surge_account_id TEXT,
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS last_verification_error TEXT,
        ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;
      `);
      return;
    }

    console.log('✅ Successfully updated business with SMS configuration');
    console.log('📊 Updated business:', updateData);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runSimpleSMSMigration();
