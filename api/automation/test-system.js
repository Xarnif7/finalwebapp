import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Automation system test started');
    
    const { businessId, testType = 'full' } = req.body;
    
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const results = {
      timestamp: new Date().toISOString(),
      businessId,
      testType,
      tests: {}
    };

    // Test 1: Check if business exists
    console.log('🔍 Test 1: Checking business existence...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, email')
      .eq('id', businessId)
      .single();

    results.tests.businessExists = {
      success: !businessError && !!business,
      error: businessError?.message,
      data: business
    };

    // Test 2: Check automation templates
    console.log('🔍 Test 2: Checking automation templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('automation_templates')
      .select('*')
      .eq('business_id', businessId);

    results.tests.templates = {
      success: !templatesError,
      error: templatesError?.message,
      count: templates?.length || 0,
      data: templates?.map(t => ({ id: t.id, name: t.name, status: t.status }))
    };

    // Test 3: Check scheduled jobs
    console.log('🔍 Test 3: Checking scheduled jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    results.tests.scheduledJobs = {
      success: !jobsError,
      error: jobsError?.message,
      count: jobs?.length || 0,
      data: jobs?.map(j => ({ 
        id: j.id, 
        job_type: j.job_type, 
        status: j.status, 
        run_at: j.run_at,
        created_at: j.created_at
      }))
    };

    // Test 4: Check review requests
    console.log('🔍 Test 4: Checking review requests...');
    const { data: requests, error: requestsError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    results.tests.reviewRequests = {
      success: !requestsError,
      error: requestsError?.message,
      count: requests?.length || 0,
      data: requests?.map(r => ({ 
        id: r.id, 
        status: r.status, 
        channel: r.channel,
        created_at: r.created_at,
        sent_at: r.sent_at
      }))
    };

    // Test 5: Check customers
    console.log('🔍 Test 5: Checking customers...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('business_id', businessId)
      .limit(5);

    results.tests.customers = {
      success: !customersError,
      error: customersError?.message,
      count: customers?.length || 0,
      data: customers?.map(c => ({ 
        id: c.id, 
        name: c.full_name, 
        email: c.email,
        hasPhone: !!c.phone
      }))
    };

    // Test 6: Test automation executor endpoint
    if (testType === 'full') {
      console.log('🔍 Test 6: Testing automation executor...');
      try {
        const executorResponse = await fetch(`${process.env.APP_BASE_URL || 'https://myblipp.com'}/api/_cron/automation-executor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const executorData = await executorResponse.json();
        
        results.tests.automationExecutor = {
          success: executorResponse.ok,
          status: executorResponse.status,
          data: executorData
        };
      } catch (executorError) {
        results.tests.automationExecutor = {
          success: false,
          error: executorError.message
        };
      }
    }

    // Test 7: Check automation logs
    console.log('🔍 Test 7: Checking automation logs...');
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    results.tests.automationLogs = {
      success: !logsError,
      error: logsError?.message,
      count: logs?.length || 0,
      data: logs?.map(l => ({ 
        id: l.id, 
        level: l.level, 
        message: l.message,
        created_at: l.created_at
      }))
    };

    // Summary
    const totalTests = Object.keys(results.tests).length;
    const passedTests = Object.values(results.tests).filter(t => t.success).length;
    
    results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100)
    };

    console.log(`✅ Automation system test completed: ${passedTests}/${totalTests} tests passed`);

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Error in automation system test:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
