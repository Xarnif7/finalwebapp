import { supabase } from './supabaseClient';

export async function logEvent(businessId: string, eventType: string, eventData?: Record<string, any>) {
  try {
    await supabase.rpc('log_telemetry_event', {
      p_business_id: businessId,
      p_event_type: eventType,
      p_event_data: eventData ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[telemetry] failed', err);
  }
}


