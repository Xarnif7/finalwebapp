// Subscription API helper
// This provides subscription status checking for the client

export async function getSubscriptionStatus() {
  try {
    const response = await fetch('/api/subscription/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.warn('[SUBSCRIPTION] API call failed, using default status');
      return { active: false, status: 'none', plan_tier: null };
    }
  } catch (error) {
    console.error('[SUBSCRIPTION] Error checking status:', error);
    // Fallback to default on error
    return { active: false, status: 'none', plan_tier: null };
  }
}

// Helper to check if user has active subscription
export function isSubscriptionActive(status) {
  return status && ['active', 'trialing'].includes(status);
}

// Helper to get plan tier display name
export function getPlanTierDisplayName(planTier) {
  const displayNames = {
    basic: 'Standard',
    pro: 'Pro',
    enterprise: 'Enterprise'
  };
  return displayNames[planTier] || planTier;
}
