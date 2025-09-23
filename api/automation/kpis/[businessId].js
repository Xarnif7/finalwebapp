import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  try {
    // Get active sequences count
    const { count: activeSequences } = await supabase
      .from('automation_templates')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active');

    // Get total recipients (customers count)
    const { count: totalRecipients } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Get automation executions for success/failure rates
    const { data: executions } = await supabase
      .from('automation_executions')
      .select('status')
      .eq('business_id', businessId);

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === 'sent').length || 0;
    const failedExecutions = executions?.filter(e => e.status === 'failed').length || 0;

    const sendSuccessRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;
    const failureRate = totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0;

    const kpis = {
      activeSequences: activeSequences || 0,
      totalRecipients: totalRecipients || 0,
      sendSuccessRate,
      failureRate,
      totalExecutions,
      successfulExecutions,
      failedExecutions
    };

    res.status(200).json(kpis);
  } catch (error) {
    console.error('Error in KPIs API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
