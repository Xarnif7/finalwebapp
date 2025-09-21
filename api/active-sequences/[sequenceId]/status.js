import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequenceId } = req.query;
    const { status } = req.body;

    if (!sequenceId || !status) {
      return res.status(400).json({ error: 'Sequence ID and status are required' });
    }

    if (!['active', 'paused', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, paused, completed, or failed' });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Update sequence status
    const { data: sequence, error } = await supabase
      .from('automation_sequences')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sequenceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating sequence status:', error);
      return res.status(500).json({ error: 'Failed to update sequence status' });
    }

    return res.status(200).json({
      success: true,
      sequence: sequence
    });

  } catch (error) {
    console.error('Error in sequence status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
