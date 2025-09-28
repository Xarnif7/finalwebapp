// Email Tracking Utilities
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate unique tracking ID for emails
export function generateTrackingId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create tracking pixel HTML
export function createTrackingPixel(trackingId) {
  return `<img src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblipp.com'}/api/email-track/open?t=${trackingId}" width="1" height="1" style="display:none;" />`;
}

// Create tracked link HTML
export function createTrackedLink(url, text, trackingId, linkType = 'feedback') {
  const trackedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://myblipp.com'}/api/email-track/click?t=${trackingId}&l=${encodeURIComponent(url)}&type=${linkType}`;
  return `<a href="${trackedUrl}" style="color: #3b82f6; text-decoration: none;">${text}</a>`;
}

// Record email sent
export async function recordEmailSent({
  emailId,
  businessId,
  customerId,
  reviewRequestId,
  emailType,
  recipientEmail,
  subject
}) {
  try {
    const { data, error } = await supabase
      .from('email_tracking')
      .insert({
        email_id: emailId,
        business_id: businessId,
        customer_id: customerId,
        review_request_id: reviewRequestId,
        email_type: emailType,
        recipient_email: recipientEmail,
        subject: subject
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording email sent:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error recording email sent:', error);
    return null;
  }
}

// Record email opened
export async function recordEmailOpened(trackingId, userAgent, ipAddress) {
  try {
    // Get the email tracking record
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('id, business_id')
      .eq('email_id', trackingId)
      .single();

    if (trackingError || !emailTracking) {
      console.error('Email tracking record not found:', trackingId);
      return;
    }

    // Check if already opened
    const { data: existingOpen } = await supabase
      .from('email_opens')
      .select('id')
      .eq('email_tracking_id', emailTracking.id)
      .single();

    if (existingOpen) {
      return; // Already recorded
    }

    // Record the open
    const { error } = await supabase
      .from('email_opens')
      .insert({
        email_tracking_id: emailTracking.id,
        user_agent: userAgent,
        ip_address: ipAddress,
        opened_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording email open:', error);
      return;
    }

    // Update the email_tracking record
    await supabase
      .from('email_tracking')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', emailTracking.id);

    console.log('Email open recorded:', trackingId);
  } catch (error) {
    console.error('Error recording email open:', error);
  }
}

// Record email click
export async function recordEmailClick(trackingId, linkUrl, linkType, userAgent, ipAddress) {
  try {
    // Get the email tracking record
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('id, business_id')
      .eq('email_id', trackingId)
      .single();

    if (trackingError || !emailTracking) {
      console.error('Email tracking record not found:', trackingId);
      return;
    }

    // Record the click
    const { error } = await supabase
      .from('email_clicks')
      .insert({
        email_tracking_id: emailTracking.id,
        link_url: linkUrl,
        link_type: linkType,
        user_agent: userAgent,
        ip_address: ipAddress,
        clicked_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording email click:', error);
      return;
    }

    // Update the email_tracking record
    await supabase
      .from('email_tracking')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', emailTracking.id);

    console.log('Email click recorded:', trackingId, linkUrl);
  } catch (error) {
    console.error('Error recording email click:', error);
  }
}

// Get email analytics for a business
export async function getEmailAnalytics(businessId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('email_tracking')
      .select(`
        *,
        email_clicks(*),
        email_opens(*),
        email_replies(*),
        customers(full_name, email),
        review_requests(message)
      `)
      .eq('business_id', businessId)
      .gte('sent_at', startDate)
      .lte('sent_at', endDate)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching email analytics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    return null;
  }
}

// Calculate email performance metrics
export function calculateEmailMetrics(analytics) {
  const totalSent = analytics.length;
  const totalOpened = analytics.filter(email => email.opened_at).length;
  const totalClicked = analytics.filter(email => email.clicked_at).length;
  const totalReplied = analytics.filter(email => email.replied_at).length;
  const totalBounced = analytics.filter(email => email.bounced_at).length;

  return {
    totalSent,
    totalOpened,
    totalClicked,
    totalReplied,
    totalBounced,
    openRate: totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(1) : 0,
    replyRate: totalSent > 0 ? (totalReplied / totalSent * 100).toFixed(1) : 0,
    bounceRate: totalSent > 0 ? (totalBounced / totalSent * 100).toFixed(1) : 0
  };
}

// Get sentiment analysis for email replies
export async function analyzeEmailReplySentiment(replyContent) {
  try {
    const response = await fetch('/api/ai/analyze-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: replyContent,
        rating: 3 // Default rating for analysis
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.sentiment;
    }
  } catch (error) {
    console.error('Error analyzing email reply sentiment:', error);
  }
  
  return 'neutral';
}
