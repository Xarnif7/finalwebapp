// Webhook endpoint to trigger automation executor immediately
// This can be called by external services or manually

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔔 Webhook triggered - calling automation executor...');
    
    // Call the automation executor API
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/_cron/automation-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('📊 Automation executor response:', data);
    
    return res.status(200).json({
      success: true,
      message: 'Automation executor triggered successfully',
      data: data
    });
    
  } catch (error) {
    console.error('❌ Error triggering automation executor:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
