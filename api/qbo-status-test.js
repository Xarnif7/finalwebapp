// Test endpoint to verify deployment
export default async function handler(req, res) {
  console.log('[QBO] TEST ENDPOINT CALLED - DEPLOYMENT VERIFICATION');
  
  return res.status(200).json({
    message: 'Deployment test successful',
    timestamp: new Date().toISOString(),
    test: true
  });
}
