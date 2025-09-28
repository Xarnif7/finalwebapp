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
        title: 'Dashboard', 
        url: 'dashboard', 
        icon: 'LayoutDashboard'
      },
      { 
        title: 'Customers', 
        url: 'customers', 
        icon: 'Users'
      },
      { 
        title: 'Automations', 
        url: 'automations', 
        icon: 'Zap'
      },
      { 
        title: 'Reviews', 
        url: 'reviews', 
        icon: 'Star',
        subItems: [
          { title: 'Inbox', url: 'reviews/inbox' },
          { title: 'AI Suggestions', url: 'reviews/ai-suggestions' },
          { title: 'Sentiment Alerts', url: 'reviews/sentiment-alerts' }
        ]
      },
      { 
        title: 'Analytics', 
        url: 'analytics', 
        icon: 'Brain',
        subItems: [
          { title: 'AI Summaries', url: 'analytics/ai-summaries' },
          { title: 'Revenue Impact', url: 'analytics/revenue-impact' }
        ]
      },
      { 
        title: 'Reporting', 
        url: 'reporting', 
        icon: 'BarChart3',
        subItems: [
          { title: 'Performance', url: 'reporting/performance' },
          { title: 'Trends', url: 'reporting/trends' },
          { title: 'Competitors', url: 'reporting/competitors' }
        ]
      },
      { 
        title: 'Feedback', 
        url: 'feedback', 
        icon: 'MessageCircle',
        subItems: [
          { title: 'Form Setup', url: 'feedback/form-setup' },
          { title: 'Collected Feedback', url: 'feedback/collected' },
          { title: 'Widget', url: 'feedback/widget' }
        ]
      },
      { 
        title: 'Settings', 
        url: 'settings', 
        icon: 'Settings',
        subItems: [
          { title: 'Business Profile', url: 'settings/business-profile' },
          { title: 'Integrations', url: 'settings/integrations' },
          { title: 'Team & Roles', url: 'settings/team-roles' },
          { title: 'Billing', url: 'settings/billing' },
          { title: 'Audit Log', url: 'settings/audit-log' }
        ]
      }
    ]
  }
];

// Public Feedback is now integrated into the main Feedback tab

// Legacy URL mappings for redirects
export const legacyUrlMappings: Record<string, string> = {
  // Dashboard redirects
  '/home': '/dashboard',
  '/overview': '/dashboard',
  
  // Automation redirects
  '/send-requests': '/automations',
  '/automated-requests': '/automations',
  '/sequences': '/automations',
  '/social-posts': '/automations',
  
  // Review redirects
  '/review-inbox': '/reviews/inbox',
  '/review-performance': '/reviews/ai-suggestions',
  '/review-tracking': '/reviews/sentiment-alerts',
  
  // Analytics redirects
  '/ai-summaries': '/analytics/ai-summaries',
  '/revenue-impact': '/analytics/revenue-impact',
  '/analytics': '/analytics',
  '/insights': '/analytics',
  
  // Reporting redirects
  '/competitors': '/reporting/competitors',
  '/conversations': '/reporting/trends',
  '/reports': '/reporting',
  '/kpis': '/reporting',
  '/nps': '/reporting',
  '/keywords': '/reporting',
  '/trends': '/reporting/trends',
  '/reply-rate': '/reporting',
  '/response-time': '/reporting',
  '/social-metrics': '/reporting/trends',
  
  // Settings redirects
  '/integrations': '/settings/integrations',
  '/team-roles': '/settings/team-roles',
  '/audit-log': '/settings/audit-log',
  '/notifications': '/settings/business-profile',
  '/billing': '/settings/billing',
  '/branding': '/settings/business-profile',
  '/templates': '/settings/business-profile',
  '/domains': '/settings/business-profile',
  '/auth': '/settings/business-profile',
  '/api-keys': '/settings/integrations',
  '/webhooks': '/settings/integrations',
  
  // Feedback redirects (now integrated into main Feedback tab)
  '/private-feedback': '/feedback/collected',
  '/public-feedback': '/feedback/form-setup',
  '/public-page': '/feedback/form-setup',
  '/embed': '/feedback/widget',
  '/widget': '/feedback/widget',
  '/public-feedback-form': '/feedback/form-setup',
  '/review-widget': '/feedback/widget',
  '/landing-badge': '/feedback/widget',
  
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
