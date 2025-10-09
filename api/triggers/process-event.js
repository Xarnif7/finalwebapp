import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Process Trigger Event - Matches events to sequences and enrolls customers
 * 
 * This is the CRITICAL connector between triggers (QBO, Zapier, manual) and journeys
 * 
 * When an event happens (invoice paid, job completed, etc.):
 * 1. Find all sequences with matching trigger_event_type
 * 2. For each matching sequence, enroll the customer
 * 3. Journey executor will then send messages on schedule
 */

// Map external event names to our internal trigger_event_type values
const EVENT_MAPPING = {
  // QuickBooks events
  'invoice.paid': 'invoice_paid',
  'invoice.created': 'invoice_created',
  'invoice.sent': 'invoice_sent',
  'invoice.overdue': 'invoice_overdue',
  'payment.received': 'payment_received',
  'customer.created': 'customer_created',
  'customer.updated': 'customer_updated',
  'job.created': 'job_created',
  'job.started': 'job_started',
  'job.completed': 'job_completed',
  'job.cancelled': 'job_cancelled',
  'estimate.created': 'estimate_created',
  'estimate.sent': 'estimate_sent',
  'estimate.accepted': 'estimate_accepted',
  'estimate.declined': 'estimate_declined',
  
  // Zapier/generic events
  'invoice_paid': 'invoice_paid',
  'job_completed': 'job_completed',
  'appointment_scheduled': 'appointment_scheduled',
  'service_completed': 'service_completed',
  'customer_created': 'customer_created'
};

export async function processTriggerEvent(businessId, eventType, customerData) {
  try {
    console.log(`[TRIGGER] Processing event: ${eventType} for business: ${businessId}`);

    // Normalize event type
    const normalizedEvent = EVENT_MAPPING[eventType] || eventType;
    console.log(`[TRIGGER] Normalized event type: ${normalizedEvent}`);

    // Find all active sequences that match this trigger
    const { data: matchingSequences, error: sequencesError } = await supabase
      .from('sequences')
      .select('id, name, trigger_event_type, allow_manual_enroll')
      .eq('business_id', businessId)
      .eq('trigger_event_type', normalizedEvent)
      .eq('status', 'active');

    if (sequencesError) {
      console.error('[TRIGGER] Error fetching sequences:', sequencesError);
      return { success: false, error: sequencesError.message };
    }

    if (!matchingSequences || matchingSequences.length === 0) {
      console.log(`[TRIGGER] No active sequences found for event: ${normalizedEvent}`);
      return { 
        success: true, 
        enrolled: 0, 
        message: `No active sequences for event ${normalizedEvent}` 
      };
    }

    console.log(`[TRIGGER] Found ${matchingSequences.length} matching sequences`);

    // Enroll customer in each matching sequence
    let enrolledCount = 0;
    const enrollments = [];

    for (const sequence of matchingSequences) {
      try {
        // Check if customer is already enrolled
        const { data: existing } = await supabase
          .from('sequence_enrollments')
          .select('id, status')
          .eq('sequence_id', sequence.id)
          .eq('customer_id', customerData.id)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          console.log(`[TRIGGER] Customer already enrolled in sequence ${sequence.name}`);
          continue;
        }

        // Get first step to determine when to start
        const { data: firstStep } = await supabase
          .from('sequence_steps')
          .select('step_index, wait_ms')
          .eq('sequence_id', sequence.id)
          .order('step_index', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!firstStep) {
          console.log(`[TRIGGER] No steps found for sequence ${sequence.name}, skipping`);
          continue;
        }

        // Calculate when to run first step
        const nextRunAt = new Date(Date.now() + (firstStep.wait_ms || 0));

        // Enroll customer
        const { data: enrollment, error: enrollError } = await supabase
          .from('sequence_enrollments')
          .insert({
            business_id: businessId,
            sequence_id: sequence.id,
            customer_id: customerData.id,
            status: 'active',
            current_step_index: firstStep.step_index,
            next_run_at: nextRunAt.toISOString(),
            last_event_at: new Date().toISOString(),
            meta: {
              trigger_event: eventType,
              trigger_source: 'webhook',
              enrolled_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (enrollError) {
          console.error(`[TRIGGER] Error enrolling in sequence ${sequence.name}:`, enrollError);
          continue;
        }

        enrolledCount++;
        enrollments.push({
          sequence_id: sequence.id,
          sequence_name: sequence.name,
          enrollment_id: enrollment.id,
          next_run_at: nextRunAt.toISOString()
        });

        console.log(`✅ [TRIGGER] Enrolled customer in "${sequence.name}" - Next run: ${nextRunAt.toISOString()}`);

      } catch (seqError) {
        console.error(`[TRIGGER] Error processing sequence ${sequence.id}:`, seqError);
      }
    }

    console.log(`✅ [TRIGGER] Successfully enrolled customer in ${enrolledCount} sequences`);

    return {
      success: true,
      enrolled: enrolledCount,
      enrollments: enrollments,
      message: `Customer enrolled in ${enrolledCount} journey(s)`
    };

  } catch (error) {
    console.error('[TRIGGER] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, event_type, customer_data } = req.body;

    if (!business_id || !event_type || !customer_data) {
      return res.status(400).json({ 
        error: 'Missing required fields: business_id, event_type, customer_data' 
      });
    }

    const result = await processTriggerEvent(business_id, event_type, customer_data);

    return res.status(200).json(result);

  } catch (error) {
    console.error('[TRIGGER] Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

