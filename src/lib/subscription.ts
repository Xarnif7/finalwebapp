export async function getSubscriptionStatusWithTimeout(ms = 6000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    const response = await fetch('/api/subscription/status', {
      credentials: 'include',
      signal: controller.signal,
    });

    if (!response.ok) {
      return 'unknown';
    }

    const data = await response.json();
    return data.status || 'unknown';
  } catch (error) {
    console.error('[SUBSCRIPTION] Error fetching status:', error);
    return 'unknown';
  } finally {
    clearTimeout(timeoutId);
  }
}
