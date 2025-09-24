import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateTemplatesWithServiceTypes() {
  console.log('🔧 Updating templates with service types...\n');
  
  try {
    // Get all active templates
    const { data: templates, error: fetchError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('status', 'active');
    
    if (fetchError) {
      console.error('❌ Error fetching templates:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${templates.length} templates to update`);
    
    // Update each template with relevant service types
    const templateUpdates = [
      {
        id: templates.find(t => t.name === 'Job Completed' && !t.service_types?.length)?.id,
        service_types: ['lawn mowing', 'landscaping', 'tree trimming', 'hedge trimming', 'general maintenance'],
        is_default: true
      },
      {
        id: templates.find(t => t.name === 'Invoice Paid' && !t.service_types?.length)?.id,
        service_types: ['invoicing', 'payment received', 'billing'],
        is_default: false
      },
      {
        id: templates.find(t => t.name === 'Service Reminder' && !t.service_types?.length)?.id,
        service_types: ['scheduled service', 'appointment reminder', 'maintenance reminder'],
        is_default: false
      }
    ];
    
    for (const update of templateUpdates) {
      if (update.id) {
        console.log(`📝 Updating template ${update.id} with service types:`, update.service_types);
        
        const { error: updateError } = await supabase
          .from('automation_templates')
          .update({
            service_types: update.service_types,
            is_default: update.is_default
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`❌ Error updating template ${update.id}:`, updateError);
        } else {
          console.log(`✅ Successfully updated template ${update.id}`);
        }
      }
    }
    
    // Test AI matching with updated templates
    console.log('\n🧪 Testing AI matching with updated templates...');
    const { data: testMatch, error: testError } = await supabase
      .rpc('find_template_for_service_type', {
        p_business_id: '3a007547-a063-4f63-be40-bb46eee30763',
        p_service_type: 'lawn mowing'
      });
    
    if (testError) {
      console.error('❌ Test matching error:', testError);
    } else {
      console.log('✅ Template matching test result:', testMatch);
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

async function main() {
  await updateTemplatesWithServiceTypes();
  console.log('\n✅ Template update completed!');
}

main().catch(console.error);
