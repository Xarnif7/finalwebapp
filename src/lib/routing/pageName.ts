/**
 * Routing utility for consistent page name detection across SSR/CSR
 * Single source of truth for page name resolution
 */

export const DEFAULT_PAGE_NAME = "Landing";

/**
 * Derives pathname in a safe way for both client and server contexts
 * In client components, uses useLocation from react-router-dom
 * In server/SSR contexts, accepts a string param or returns "/" if unavailable
 */
export function derivePathname(pathname?: string): string {
  // If pathname is provided (server context or explicit), use it
  if (pathname !== undefined) {
    return pathname;
  }
  
  // In client context, try to get from window.location
  if (typeof window !== 'undefined' && window.location) {
    return window.location.pathname;
  }
  
  // Fallback to root
  return "/";
}

/**
 * Maps route paths to stable TitleCase page keys
 * Never returns undefined - always returns a valid page name
 */
export function getPageNameFromPath(pathname: string): string {
  if (!pathname || pathname === '') {
    return DEFAULT_PAGE_NAME;
  }
  
  // Normalize pathname
  let normalizedPath = pathname;
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // Handle root path
  if (normalizedPath === '/') {
    return DEFAULT_PAGE_NAME;
  }
  
  // Extract the last part of the path
  let urlLastPart = normalizedPath.split('/').pop();
  if (urlLastPart?.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }
  
  if (!urlLastPart) {
    return DEFAULT_PAGE_NAME;
  }
  
  // Handle special cases and kebab-case URLs
  const specialRoutes: Record<string, string> = {
    'paywall': 'Paywall',
    'how-it-works': 'HowItWorks',
    'simple-setup': 'SimpleSetup',
    'features': 'Features',
    'testimonials': 'Testimonials',
    'post-checkout': 'PostCheckout',
    'login': 'Landing', // Login shows landing page
    'pricing': 'Paywall',
    'auth': 'Landing', // Auth callback shows landing
    'dashboard': 'DashboardOverview',
    'analytics': 'Analytics',
    'customers': 'Clients',
    'automations': 'Automations',
    'reviews': 'Reviews',
    'feedback': 'Feedback',
    'settings': 'Settings',
    'team-roles': 'TeamRoles',
    'onboarding': 'Onboarding',
    'privacy': 'Privacy',
    'terms': 'Terms',
  };
  
  // Check special routes first
  if (specialRoutes[urlLastPart]) {
    return specialRoutes[urlLastPart];
  }
  
  // Handle QR code redirects (r/{code})
  if (normalizedPath.includes('/r/')) {
    return 'QRRedirect';
  }
  
  // Handle feedback collection (feedback/{requestId}) - public customer page
  if (normalizedPath.includes('/feedback/')) {
    return 'FeedbackCollection';
  }
  
  // Convert kebab-case to PascalCase for matching
  const pascalCaseUrl = urlLastPart
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  // Handle legacy aliases and common dashboard routes
  const legacyAliases: Record<string, string> = {
    'Dashboard': 'Dashboard',
    'Clients': 'Clients',
    'ReviewInbox': 'ReviewInbox',
    'SendRequests': 'SendRequests',
    'AutomatedRequests': 'AutomatedRequests',
    'ReviewTracking': 'ReviewTracking',
    'ReviewPerformance': 'ReviewPerformance',
    'SocialPosts': 'SocialPosts',
    'Sequences': 'Sequences',
    'Competitors': 'Competitors',
    'Analytics': 'Analytics',
    'TeamRoles': 'TeamRoles',
    'AuditLog': 'AuditLog',
    'CsvImport': 'CsvImport',
    'Notifications': 'Notifications',
    'Integrations': 'Integrations',
    'RevenueImpact': 'RevenueImpact',
    'Conversations': 'Conversations',
    'PrivateFeedback': 'PrivateFeedback',
    'Feedback': 'Feedback',
  };
  
  // Check if it's a known page name
  if (legacyAliases[pascalCaseUrl]) {
    return legacyAliases[pascalCaseUrl];
  }
  
  // Default fallback
  return DEFAULT_PAGE_NAME;
}
