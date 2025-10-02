export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Test send API called with:', req.body);
    
    const { businessId, customerId, templateId, message, channel = 'email', to } = req.body;

    if (!businessId || !customerId || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For now, just simulate sending an email
    console.log('🚀 Simulating email send to:', to);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = {
      success: true,
      message: 'Test email sent successfully!',
      channel: channel,
      recipient: to,
      emailId: 'test-' + Date.now()
    };

    console.log('🚀 Test send result:', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in test send:', error);
    return res.status(500).json({ error: error.message || 'Failed to send message' });
  }
}
