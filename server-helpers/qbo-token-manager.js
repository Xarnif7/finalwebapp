/**
 * QuickBooks Token Manager
 * 
 * Handles automatic token refresh for QuickBooks integrations
 * Ensures tokens are ALWAYS fresh before making API calls
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check if QBO token is expired or will expire soon
 * Refresh if < 1 hour remaining (aggressive refresh)
 */
function isTokenExpiredOrExpiringSoon(integration) {
  if (!integration.token_expires_at) return true;
  
  const now = new Date();
  const expiresAt = new Date(integration.token_expires_at);
  const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);
  
  // Refresh if less than 60 minutes remaining (was 7 days before - too lazy!)
  return minutesUntilExpiry <= 60;
}

/**
 * Refresh QBO access token using refresh_token
 * Returns updated integration data with fresh access_token
 */
export async function refreshQBOToken(integration) {
  try {
    console.log(`[QBO_TOKEN_MANAGER] Refreshing token for realm: ${integration.realm_id}`);

    if (!integration.refresh_token) {
      throw new Error('No refresh token available - user must re-authenticate');
    }

    if (!process.env.QBO_CLIENT_ID || !process.env.QBO_CLIENT_SECRET) {
      throw new Error('QBO_CLIENT_ID or QBO_CLIENT_SECRET not configured');
    }

    // Call QuickBooks token refresh endpoint
    const basic = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${basic}`, 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ 
        grant_type: 'refresh_token', 
        refresh_token: integration.refresh_token 
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[QBO_TOKEN_MANAGER] Refresh failed:', errorText);
      
      // If refresh token is invalid, mark as disconnected
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabase
          .from('integrations_quickbooks')
          .update({ 
            connection_status: 'disconnected',
            error_message: 'Refresh token expired - please reconnect',
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);
        
        throw new Error('Refresh token expired - user must reconnect QuickBooks');
      }
      
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
    
    // Update database with new tokens
    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations_quickbooks')
      .update({ 
        access_token: tokenData.access_token, 
        refresh_token: tokenData.refresh_token || integration.refresh_token, 
        token_expires_at: expiresAt, 
        connection_status: 'connected',
        error_message: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', integration.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to save refreshed tokens: ${updateError.message}`);
    }

    console.log(`✅ [QBO_TOKEN_MANAGER] Token refreshed successfully. Expires: ${expiresAt}`);
    
    return updatedIntegration;

  } catch (error) {
    console.error('[QBO_TOKEN_MANAGER] Refresh error:', error.message);
    throw error;
  }
}

/**
 * Get fresh QBO integration with auto-refresh if needed
 * THIS SHOULD BE CALLED BEFORE EVERY QBO API CALL!
 */
export async function getFreshQBOIntegration(businessId, realmId = null) {
  try {
    // Get integration from database
    let query = supabase
      .from('integrations_quickbooks')
      .select('*')
      .eq('business_id', businessId)
      .eq('connection_status', 'connected')
      .order('created_at', { ascending: false });

    if (realmId) {
      query = query.eq('realm_id', realmId);
    }

    const { data: integrations, error } = await query.limit(1);

    if (error || !integrations || integrations.length === 0) {
      throw new Error('No active QuickBooks integration found');
    }

    let integration = integrations[0];

    // Check if token is expired or expiring soon
    if (isTokenExpiredOrExpiringSoon(integration)) {
      console.log('[QBO_TOKEN_MANAGER] Token expired or expiring soon, refreshing...');
      
      try {
        integration = await refreshQBOToken(integration);
        console.log('✅ [QBO_TOKEN_MANAGER] Token refreshed proactively');
      } catch (refreshError) {
        console.error('[QBO_TOKEN_MANAGER] Proactive refresh failed:', refreshError.message);
        
        // If refresh fails, throw error so user knows to reconnect
        throw new Error('QuickBooks connection expired - please reconnect in Settings');
      }
    } else {
      const expiresAt = new Date(integration.token_expires_at);
      const minutesRemaining = (expiresAt - new Date()) / (1000 * 60);
      console.log(`[QBO_TOKEN_MANAGER] Token is fresh (${Math.round(minutesRemaining)} minutes remaining)`);
    }

    return integration;

  } catch (error) {
    console.error('[QBO_TOKEN_MANAGER] Error getting fresh integration:', error.message);
    throw error;
  }
}

/**
 * Make QBO API call with automatic token refresh on 401 errors
 * This is a wrapper that handles auth failures gracefully
 */
export async function makeQBOApiCall(integration, apiCall) {
  try {
    // First attempt with current token
    let response = await apiCall(integration.access_token);

    // If 401 or 403, try refreshing token and retry once
    if (response.status === 401 || response.status === 403) {
      console.log('[QBO_TOKEN_MANAGER] Got 401/403, attempting token refresh...');
      
      try {
        const refreshedIntegration = await refreshQBOToken(integration);
        console.log('[QBO_TOKEN_MANAGER] Token refreshed, retrying API call...');
        
        // Retry with fresh token
        response = await apiCall(refreshedIntegration.access_token);
        
      } catch (refreshError) {
        console.error('[QBO_TOKEN_MANAGER] Refresh on 401 failed:', refreshError.message);
        throw new Error('QuickBooks authentication failed - please reconnect');
      }
    }

    return response;

  } catch (error) {
    console.error('[QBO_TOKEN_MANAGER] API call error:', error.message);
    throw error;
  }
}

export default {
  refreshQBOToken,
  getFreshQBOIntegration,
  makeQBOApiCall,
  isTokenExpiredOrExpiringSoon
};

