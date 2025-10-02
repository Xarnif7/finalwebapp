// Alternative cron endpoint that can be called more reliably
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 [CRON] Automation executor triggered...');
    
    // Call the main automation executor
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/automation-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('📊 [CRON] Automation executor response:', data);
    
    return res.status(200).json({
      success: true,
      message: 'Cron automation executor completed',
      data: data
    });
    
  } catch (error) {
    console.error('❌ [CRON] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
