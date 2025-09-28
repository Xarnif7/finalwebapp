// Email Click Tracking Endpoint
import { recordEmailClick } from '../../../src/lib/emailTracking.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { t: trackingId, l: linkUrl, type: linkType } = req.query;
    
    if (!trackingId || !linkUrl) {
      return res.status(400).json({ error: 'Tracking ID and link URL required' });
    }

    // Get user agent and IP
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress;

    // Record the email click
    await recordEmailClick(trackingId, decodeURIComponent(linkUrl), linkType, userAgent, ipAddress);

    // Redirect to the actual URL
    res.setHeader('Location', decodeURIComponent(linkUrl));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(302).end();
  } catch (error) {
    console.error('Error in email click tracking:', error);
    
    // Still redirect even if tracking fails
    if (req.query.l) {
      res.setHeader('Location', decodeURIComponent(req.query.l));
      return res.status(302).end();
    }
    
    return res.status(400).json({ error: 'Invalid link' });
  }
}
