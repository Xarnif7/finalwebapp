import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Enroll a customer in a sequence/journey
 * This starts their journey through the automated message flow
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequence_id, customer_id, business_id, trigger_source } = req.body;

    // Validate required fields
    if (!sequence_id || !customer_id || !business_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: sequence_id, customer_id, business_id' 
      });
    }

    console.log(`[ENROLL] Enrolling customer ${customer_id} in sequence ${sequence_id}`);

    // Check if customer is already enrolled in this sequence
    const { data: existingEnrollment } = await supabase
      .from('sequence_enrollments')
      .select('id, status')
      .eq('sequence_id', sequence_id)
      .eq('customer_id', customer_id)
      .eq('status', 'active')
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ 
        error: 'Customer is already enrolled in this sequence',
        enrollment_id: existingEnrollment.id 
      });
    }

    // Get the first step of the sequence
    const { data: firstStep, error: stepError } = await supabase
      .from('sequence_steps')
      .select('step_index, wait_ms')
      .eq('sequence_id', sequence_id)
      .order('step_index', { ascending: true })
      .limit(1)
      .single();

    if (stepError || !firstStep) {
      return res.status(404).json({ 
        error: 'No steps found for this sequence' 
      });
    }

    // Calculate next run time based on first step's wait_ms
    const nextRunAt = new Date(Date.now() + (firstStep.wait_ms || 0));

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('sequence_enrollments')
      .insert({
        business_id: business_id,
        sequence_id: sequence_id,
        customer_id: customer_id,
        status: 'active',
        current_step_index: firstStep.step_index,
        next_run_at: nextRunAt.toISOString(),
        last_event_at: new Date().toISOString(),
        meta: {
          trigger_source: trigger_source || 'manual',
          enrolled_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (enrollError) {
      console.error('[ENROLL] Error creating enrollment:', enrollError);
      return res.status(500).json({ error: 'Failed to enroll customer' });
    }

    console.log(`✅ [ENROLL] Customer enrolled successfully:`, enrollment.id);

    // Log telemetry event
    try {
      await supabase.rpc('log_telemetry_event', {
        p_business_id: business_id,
        p_event_type: 'sequence_enrollment_created',
        p_event_data: {
          enrollment_id: enrollment.id,
          sequence_id: sequence_id,
          customer_id: customer_id,
          trigger_source: trigger_source
        }
      });
    } catch (telemetryError) {
      // Don't fail the request if telemetry fails
      console.error('[ENROLL] Telemetry error:', telemetryError);
    }

    return res.status(200).json({
      success: true,
      enrollment: enrollment,
      message: 'Customer enrolled in sequence successfully',
      next_run_at: nextRunAt.toISOString()
    });

  } catch (error) {
    console.error('[ENROLL] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

