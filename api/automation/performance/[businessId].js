import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
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
    // Get automation execution metrics
    const { data: executions, error: execError } = await supabase
      .from('automation_executions')
      .select('*')
      .eq('business_id', businessId);

    if (execError) {
      console.error('Error fetching automation executions:', execError);
      return res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }

    // Calculate metrics
    const totalSent = executions.length;
    const totalDelivered = executions.filter(e => e.status === 'delivered' || e.status === 'opened' || e.status === 'clicked').length;
    const totalOpened = executions.filter(e => e.status === 'opened' || e.status === 'clicked').length;
    const totalClicked = executions.filter(e => e.status === 'clicked').length;
    const totalReviews = executions.filter(e => e.status === 'review_received').length;

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
    const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : 0;
    const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0;
    const reviewRate = totalClicked > 0 ? ((totalReviews / totalClicked) * 100).toFixed(1) : 0;

    const metrics = {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalReviews,
      deliveryRate: parseFloat(deliveryRate),
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
      reviewRate: parseFloat(reviewRate)
    };

    res.status(200).json({ metrics });
  } catch (error) {
    console.error('Error in performance API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
