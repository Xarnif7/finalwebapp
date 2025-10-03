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

async function runSMSMigration() {
  try {
    console.log('🚀 Running SMS fields migration...');
    
    // Add SMS configuration columns to businesses table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS from_number TEXT,
        ADD COLUMN IF NOT EXISTS surge_account_id TEXT,
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'active', 'action_needed', 'disabled')),
        ADD COLUMN IF NOT EXISTS last_verification_error TEXT,
        ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;
      `
    });

    if (alterError) {
      console.error('❌ Error adding columns:', alterError);
      return;
    }

    console.log('✅ Added SMS columns to businesses table');

    // Add indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_businesses_sms_enabled ON businesses(sms_enabled);
        CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON businesses(verification_status);
      `
    });

    if (indexError) {
      console.error('❌ Error adding indexes:', indexError);
      return;
    }

    console.log('✅ Added SMS indexes');

    // Update existing businesses to have SMS enabled
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ 
        sms_enabled: true, 
        from_number: '+18775402797',
        verification_status: 'active'
      })
      .not('phone', 'is', null)
      .neq('phone', '');

    if (updateError) {
      console.error('❌ Error updating businesses:', updateError);
      return;
    }

    console.log('✅ Updated existing businesses with SMS configuration');

    // Verify the migration
    const { data: businesses, error: verifyError } = await supabase
      .from('businesses')
      .select('id, name, from_number, sms_enabled, verification_status')
      .limit(5);

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('📊 Sample businesses after migration:');
    businesses.forEach(business => {
      console.log(`  - ${business.name}: SMS=${business.sms_enabled}, Number=${business.from_number}, Status=${business.verification_status}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runSMSMigration();
