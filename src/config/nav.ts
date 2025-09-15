// Centralized navigation configuration for Blipp dashboard
// This prevents drift between different navigation components

import { FEATURE_FLAGS, isFeatureEnabled } from '../lib/featureFlags';

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  subItems?: NavItem[];
  featureFlag?: string;
  roles?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Navigation configuration
export const navigationGroups: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { 
        title: 'Customers', 
        url: 'customers', 
        icon: 'Users' // Will be imported from lucide-react
      },
      { 
        title: 'Automations', 
        url: 'automations', 
        icon: 'Zap',
        subItems: [
          { title: 'Send Requests', url: 'automations/send-requests' },
          { title: 'Automated Requests', url: 'automations/automated-requests' },
          { title: 'Sequences', url: 'automations/sequences' },
          { title: 'Social Posts', url: 'automations/social-posts' }
        ]
      },
      { 
        title: 'Reviews', 
        url: 'reviews', 
        icon: 'Star',
        subItems: [
          { title: 'Review Inbox', url: 'reviews/inbox' },
          { title: 'Performance', url: 'reviews/performance' },
          { title: 'Tracking', url: 'reviews/tracking' }
        ]
      },
      { 
        title: 'Reporting', 
        url: 'reporting', 
        icon: 'BarChart3',
        subItems: [
          { title: 'Revenue Impact', url: 'reporting/revenue-impact' },
          { title: 'Competitors', url: 'reporting/competitors' },
          { title: 'Conversations', url: 'reporting/conversations' }
        ]
      },
      { 
        title: 'Settings', 
        url: 'settings', 
        icon: 'Settings',
        subItems: [
          { title: 'Integrations', url: 'settings/integrations' },
          { title: 'Team & Roles', url: 'settings/team-roles' },
          { title: 'Audit Log', url: 'settings/audit-log' },
          { title: 'Notifications', url: 'settings/notifications' }
        ]
      }
    ]
  }
];

// Add Public Feedback if feature flag is enabled (enabled by default)
if (isFeatureEnabled(FEATURE_FLAGS.PUBLIC_FEEDBACK_ENABLED) || true) {
  navigationGroups[0].items.push({
    title: 'Public Feedback',
    url: 'public-feedback',
    icon: 'MessageCircle',
    featureFlag: FEATURE_FLAGS.PUBLIC_FEEDBACK_ENABLED
  });
}

// Legacy URL mappings for redirects
export const legacyUrlMappings: Record<string, string> = {
  // Dashboard redirects
  '/dashboard': '/reporting',
  '/home': '/reporting',
  '/overview': '/reporting',
  
  // Automation redirects
  '/send-requests': '/automations/send-requests',
  '/automated-requests': '/automations/automated-requests',
  '/sequences': '/automations/sequences',
  '/social-posts': '/automations/social-posts',
  
  // Review redirects
  '/review-inbox': '/reviews/inbox',
  '/review-performance': '/reviews/performance',
  '/review-tracking': '/reviews/tracking',
  
  // Reporting redirects
  '/revenue-impact': '/reporting/revenue-impact',
  '/competitors': '/reporting/competitors',
  '/conversations': '/reporting/conversations',
  '/reports': '/reporting',
  '/analytics': '/reporting',
  '/insights': '/reporting',
  '/kpis': '/reporting',
  '/nps': '/reporting',
  '/keywords': '/reporting',
  '/trends': '/reporting',
  '/reply-rate': '/reporting',
  '/response-time': '/reporting',
  '/social-metrics': '/reporting/social-metrics',
  
  // Settings redirects
  '/integrations': '/settings/integrations',
  '/team-roles': '/settings/team-roles',
  '/audit-log': '/settings/audit-log',
  '/notifications': '/settings/notifications',
  '/billing': '/settings/billing',
  '/branding': '/settings/branding',
  '/templates': '/settings/templates',
  '/domains': '/settings/domains',
  '/auth': '/settings/auth',
  '/api-keys': '/settings/api-keys',
  '/webhooks': '/settings/webhooks',
  
  // Public Feedback redirects
  '/private-feedback': '/public-feedback',
  '/public-page': '/public-feedback',
  '/embed': '/public-feedback',
  '/widget': '/public-feedback',
  '/public-feedback-form': '/public-feedback',
  '/review-widget': '/public-feedback',
  '/landing-badge': '/public-feedback',
  
  // Keep existing customers route
  '/clients': '/customers',
  '/csv-import': '/customers/import'
};

// Get all navigation items flattened for easy access
export const getAllNavItems = (): NavItem[] => {
  return navigationGroups.flatMap(group => 
    group.items.flatMap(item => 
      item.subItems ? [item, ...item.subItems] : [item]
    )
  );
};

// Get navigation item by URL
export const getNavItemByUrl = (url: string): NavItem | undefined => {
  return getAllNavItems().find(item => 
    item.url === url || item.url === `/${url}` || `/${item.url}` === url
  );
};
