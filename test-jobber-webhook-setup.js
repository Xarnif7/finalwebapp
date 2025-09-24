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

async function testJobberWebhookSetup() {
  console.log('🧪 Testing Jobber Webhook Setup...\n');
  
  try {
    // Check environment variables
    console.log('📋 Environment Variables Check:');
    console.log(`✅ NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || '❌ MISSING'}`);
    console.log(`✅ JOBBER_CLIENT_ID: ${process.env.JOBBER_CLIENT_ID ? 'Set' : '❌ MISSING'}`);
    console.log(`✅ JOBBER_CLIENT_SECRET: ${process.env.JOBBER_CLIENT_SECRET ? 'Set' : '❌ MISSING'}`);
    console.log(`✅ JOBBER_REDIRECT_URI: ${process.env.JOBBER_REDIRECT_URI || '❌ MISSING'}`);
    
    // Get active Jobber connections
    const { data: connections, error: connectionsError } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('crm_type', 'jobber')
      .eq('status', 'active');
    
    if (connectionsError) {
      console.error('❌ Error fetching connections:', connectionsError);
      return;
    }
    
    console.log(`\n📋 Found ${connections.length} active Jobber connections`);
    
    if (connections.length === 0) {
      console.log('⚠️ No active connections found. Testing with first available connection...');
      const { data: allConnections } = await supabase
        .from('crm_connections')
        .select('*')
        .eq('crm_type', 'jobber')
        .limit(1);
      
      if (allConnections.length === 0) {
        console.log('❌ No Jobber connections found at all');
        return;
      }
      
      connections.push(allConnections[0]);
    }
    
    const connection = connections[0];
    console.log('📊 Testing with connection:', {
      id: connection.id,
      business_id: connection.business_id,
      status: connection.status,
      has_access_token: !!connection.access_token,
      has_webhook_id: !!connection.webhook_id
    });
    
    // Test webhook setup manually
    if (connection.access_token) {
      console.log('\n🔧 Testing webhook setup...');
      
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/jobber/webhook`;
      console.log('📡 Webhook URL:', webhookUrl);
      
      try {
        const webhookResponse = await fetch('https://api.getjobber.com/api/webhooks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: webhookUrl,
            events: ['job.closed']
          })
        });
        
        if (webhookResponse.ok) {
          const webhook = await webhookResponse.json();
          console.log('✅ Webhook created successfully:', webhook);
          
          // Update connection with webhook ID
          const { error: updateError } = await supabase
            .from('crm_connections')
            .update({ 
              webhook_id: webhook.id,
              webhook_url: webhookUrl,
              status: 'active'
            })
            .eq('id', connection.id);
          
          if (updateError) {
            console.error('❌ Error updating connection:', updateError);
          } else {
            console.log('✅ Connection updated with webhook info');
          }
          
        } else {
          const errorText = await webhookResponse.text();
          console.error('❌ Webhook creation failed:', webhookResponse.status, errorText);
        }
        
      } catch (webhookError) {
        console.error('❌ Webhook setup error:', webhookError.message);
      }
    } else {
      console.log('❌ No access token available for webhook setup');
    }
    
    // Test AI template matching
    console.log('\n🤖 Testing AI template matching...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://myblipp.com'}/api/ai/match-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobberServiceType: 'lawn mowing and landscaping',
          businessId: connection.business_id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI template matching works');
        console.log('📊 AI Result:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ AI template matching failed:', response.status, errorText);
      }
    } catch (aiError) {
      console.error('❌ AI template matching error:', aiError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  await testJobberWebhookSetup();
  console.log('\n✅ Webhook setup test completed!');
}

main().catch(console.error);
