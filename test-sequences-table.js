// Test script to check and create sequences table
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSequencesTable() {
  console.log('🔍 Testing sequences table...');
  
  try {
    // Check if sequences table exists
    const { data: sequences, error } = await supabase
      .from('sequences')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Sequences table does not exist or has issues:', error.message);
      
      // Create the sequences table
      console.log('🔧 Creating sequences table...');
      
      const createTableSQL = `
        -- Create sequences table
        CREATE TABLE IF NOT EXISTS sequences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'draft')),
          trigger_event_type TEXT,
          allow_manual_enroll BOOLEAN DEFAULT false,
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          rate_per_hour INTEGER DEFAULT 100,
          rate_per_day INTEGER DEFAULT 1000,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create sequence_steps table
        CREATE TABLE IF NOT EXISTS sequence_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('send_email', 'send_sms', 'wait', 'branch')),
          step_index INTEGER NOT NULL,
          wait_ms INTEGER,
          template_id UUID,
          message_purpose TEXT,
          message_config JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their sequences" ON sequences
        FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
        
        CREATE POLICY "Users can insert their sequences" ON sequences
        FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
        
        CREATE POLICY "Users can update their sequences" ON sequences
        FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
        
        CREATE POLICY "Users can delete their sequences" ON sequences
        FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email'));
        
        CREATE POLICY "Users can view their sequence steps" ON sequence_steps
        FOR SELECT USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));
        
        CREATE POLICY "Users can insert their sequence steps" ON sequence_steps
        FOR INSERT WITH CHECK (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));
        
        CREATE POLICY "Users can update their sequence steps" ON sequence_steps
        FOR UPDATE USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));
        
        CREATE POLICY "Users can delete their sequence steps" ON sequence_steps
        FOR DELETE USING (sequence_id IN (SELECT id FROM sequences WHERE business_id IN (SELECT id FROM businesses WHERE created_by = auth.jwt() ->> 'email')));
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('❌ Error creating tables:', createError);
        return;
      }
      
      console.log('✅ Sequences table created successfully!');
    } else {
      console.log('✅ Sequences table exists and is accessible');
    }
    
    // Test inserting a sample sequence
    console.log('🧪 Testing sequence creation...');
    
    // Get a business ID to test with
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (businesses && businesses.length > 0) {
      const businessId = businesses[0].id;
      
      const { data: testSequence, error: insertError } = await supabase
        .from('sequences')
        .insert({
          business_id: businessId,
          name: 'Test Journey',
          status: 'active',
          trigger_event_type: 'manual',
          allow_manual_enroll: true
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error creating test sequence:', insertError);
      } else {
        console.log('✅ Test sequence created:', testSequence.id);
        
        // Clean up test sequence
        await supabase
          .from('sequences')
          .delete()
          .eq('id', testSequence.id);
        
        console.log('🧹 Test sequence cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing sequences table:', error);
  }
}

testSequencesTable();
