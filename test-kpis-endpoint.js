// Test script to verify automation KPIs endpoint works
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function testKPIsEndpoint() {
  console.log('🧪 Testing Automation KPIs Endpoint...');
  
  try {
    const businessId = '5fcd7b0d-aa61-4b72-bba7-0709e0d2fba2';
    const response = await fetch(`https://myblipp.com/api/automation/kpis/${businessId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ KPIs endpoint working!');
      console.log('📊 Raw API response:');
      console.log(JSON.stringify(data.kpis, null, 2));
      
      console.log('\n📊 KPIs data (frontend fields):');
      console.log('  - Active Sequences:', data.kpis.activeSequences);
      console.log('  - Send Success Rate:', data.kpis.sendSuccessRate + '%');
      console.log('  - Failure Rate:', data.kpis.failureRate + '%');
      console.log('  - Total Recipients:', data.kpis.totalRecipients);
      console.log('  - Total Sends:', data.kpis.totalSends);
      console.log('  - Successful Sends:', data.kpis.successfulSends);
      console.log('  - Failed Sends:', data.kpis.failedSends);
      console.log('  - Customers in Sequences:', data.kpis.customersInSequences);
      console.log('  - Conversion Rate (7d):', data.kpis.conversionRate7d + '%');
      console.log('  - Has Data:', data.kpis.hasData);
    } else {
      console.error('❌ KPIs endpoint returned error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing KPIs endpoint:', error.message);
  }
}

testKPIsEndpoint();
