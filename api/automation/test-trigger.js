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
    console.log('🧪 Test automation trigger started');
    
    const { 
      businessId, 
      templateId, 
      customerId, 
      triggerType = 'manual_test',
      testEmail = null 
    } = req.body;
    
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const results = {
      timestamp: new Date().toISOString(),
      businessId,
      templateId,
      customerId,
      triggerType,
      steps: []
    };

    // Step 1: Verify business exists
    console.log('🔍 Step 1: Verifying business...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, email')
      .eq('id', businessId)
      .single();

    results.steps.push({
      step: 'verify_business',
      success: !businessError && !!business,
      error: businessError?.message,
      data: business
    });

    if (businessError || !business) {
      return res.status(404).json({ 
        success: false,
        error: 'Business not found',
        results
      });
    }

    // Step 2: Get or create test customer
    console.log('🔍 Step 2: Setting up test customer...');
    let testCustomer;
    
    if (customerId) {
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single();

      if (customerError || !existingCustomer) {
        results.steps.push({
          step: 'get_customer',
          success: false,
          error: 'Customer not found'
        });
        return res.status(404).json({ 
          success: false,
          error: 'Customer not found',
          results
        });
      }
      
      testCustomer = existingCustomer;
    } else {
      // Create test customer
      const testCustomerData = {
        business_id: businessId,
        full_name: 'Test Customer',
        email: testEmail || 'test@example.com',
        phone: '+1234567890',
        source: 'automation_test'
      };

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert(testCustomerData)
        .select()
        .single();

      if (createError) {
        results.steps.push({
          step: 'create_customer',
          success: false,
          error: createError.message
        });
        return res.status(500).json({ 
          success: false,
          error: 'Failed to create test customer',
          results
        });
      }
      
      testCustomer = newCustomer;
    }

    results.steps.push({
      step: 'setup_customer',
      success: true,
      data: {
        id: testCustomer.id,
        name: testCustomer.full_name,
        email: testCustomer.email
      }
    });

    // Step 3: Get automation template
    console.log('🔍 Step 3: Getting automation template...');
    let template;
    
    if (templateId) {
      const { data: existingTemplate, error: templateError } = await supabase
        .from('automation_templates')
        .select('*')
        .eq('id', templateId)
        .eq('business_id', businessId)
        .single();

      if (templateError || !existingTemplate) {
        results.steps.push({
          step: 'get_template',
          success: false,
          error: 'Template not found'
        });
        return res.status(404).json({ 
          success: false,
          error: 'Template not found',
          results
        });
      }
      
      template = existingTemplate;
    } else {
      // Create test template
      const testTemplateData = {
        business_id: businessId,
        key: 'test_automation',
        name: 'Test Automation',
        status: 'active',
        channels: ['email'],
        trigger_type: 'event',
        config_json: {
          message: 'This is a test automation message. Thank you for testing our system!',
          delay_hours: 0
        }
      };

      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('automation_templates')
        .insert(testTemplateData)
        .select()
        .single();

      if (createTemplateError) {
        results.steps.push({
          step: 'create_template',
          success: false,
          error: createTemplateError.message
        });
        return res.status(500).json({ 
          success: false,
          error: 'Failed to create test template',
          results
        });
      }
      
      template = newTemplate;
    }

    results.steps.push({
      step: 'setup_template',
      success: true,
      data: {
        id: template.id,
        name: template.name,
        status: template.status
      }
    });

    // Step 4: Create review request
    console.log('🔍 Step 4: Creating review request...');
    const reviewRequestData = {
      business_id: businessId,
      customer_id: testCustomer.id,
      template_id: template.id,
      channel: 'email',
      message: template.config_json?.message || 'Test automation message',
      review_link: `https://myblipp.com/review/${businessId}/${testCustomer.id}`,
      status: 'pending',
      trigger_type: triggerType
    };

    const { data: reviewRequest, error: requestError } = await supabase
      .from('review_requests')
      .insert(reviewRequestData)
      .select()
      .single();

    if (requestError) {
      results.steps.push({
        step: 'create_review_request',
        success: false,
        error: requestError.message
      });
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create review request',
        results
      });
    }

    results.steps.push({
      step: 'create_review_request',
      success: true,
      data: {
        id: reviewRequest.id,
        status: reviewRequest.status,
        review_link: reviewRequest.review_link
      }
    });

    // Step 5: Schedule automation job
    console.log('🔍 Step 5: Scheduling automation job...');
    const delayHours = template.config_json?.delay_hours || 0;
    const runAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

    const scheduledJobData = {
      business_id: businessId,
      job_type: 'automation_email',
      payload: {
        review_request_id: reviewRequest.id,
        business_id: businessId,
        template_id: template.id,
        template_name: template.name
      },
      run_at: runAt,
      status: 'queued'
    };

    const { data: scheduledJob, error: jobError } = await supabase
      .from('scheduled_jobs')
      .insert(scheduledJobData)
      .select()
      .single();

    if (jobError) {
      results.steps.push({
        step: 'schedule_job',
        success: false,
        error: jobError.message
      });
      return res.status(500).json({ 
        success: false,
        error: 'Failed to schedule automation job',
        results
      });
    }

    results.steps.push({
      step: 'schedule_job',
      success: true,
      data: {
        id: scheduledJob.id,
        run_at: scheduledJob.run_at,
        status: scheduledJob.status
      }
    });

    // Step 6: Test immediate execution (if delay is 0)
    if (delayHours === 0) {
      console.log('🔍 Step 6: Testing immediate execution...');
      try {
        const executorResponse = await fetch(`${process.env.APP_BASE_URL || 'https://myblipp.com'}/api/_cron/automation-executor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const executorData = await executorResponse.json();
        
        results.steps.push({
          step: 'immediate_execution',
          success: executorResponse.ok,
          data: executorData
        });
      } catch (executorError) {
        results.steps.push({
          step: 'immediate_execution',
          success: false,
          error: executorError.message
        });
      }
    }

    // Summary
    const totalSteps = results.steps.length;
    const passedSteps = results.steps.filter(s => s.success).length;
    
    results.summary = {
      totalSteps,
      passedSteps,
      failedSteps: totalSteps - passedSteps,
      successRate: Math.round((passedSteps / totalSteps) * 100)
    };

    console.log(`✅ Test automation trigger completed: ${passedSteps}/${totalSteps} steps passed`);

    return res.status(200).json({
      success: true,
      results,
      message: `Automation test completed successfully. ${passedSteps}/${totalSteps} steps passed.`
    });

  } catch (error) {
    console.error('❌ Error in test automation trigger:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
