import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Define route mappings
  const routeMap = {
    '/': { name: 'Dashboard', icon: '🏠' },
    '/dashboard': { name: 'Dashboard', icon: '🏠' },
    '/customers': { name: 'Customers', icon: '👥' },
    '/automated-requests': { name: 'Automations', icon: '⚡' },
    '/sequences': { name: 'Sequences', icon: '📋' },
    '/review-inbox': { name: 'Review Inbox', icon: '⭐' },
    '/conversations': { name: 'Conversations', icon: '💬' },
    '/analytics': { name: 'Analytics', icon: '📊' },
    '/settings': { name: 'Settings', icon: '⚙️' },
    '/templates': { name: 'Templates', icon: '📝' },
    '/social': { name: 'Social Media', icon: '📱' },
    '/billing': { name: 'Billing', icon: '💳' },
  };

  // Function to generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always start with Dashboard
    breadcrumbs.push({
      name: 'Dashboard',
      path: '/dashboard',
      icon: '🏠',
      isClickable: true
    });

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Handle nested routes
      if (segment === 'edit' && pathSegments[index - 1]) {
        const parentRoute = routeMap[`/${pathSegments[index - 1]}`];
        if (parentRoute) {
          breadcrumbs.push({
            name: `Edit ${parentRoute.name}`,
            path: currentPath,
            icon: '✏️',
            isClickable: false
          });
        }
      } else if (segment === 'new' && pathSegments[index - 1]) {
        const parentRoute = routeMap[`/${pathSegments[index - 1]}`];
        if (parentRoute) {
          breadcrumbs.push({
            name: `New ${parentRoute.name}`,
            path: currentPath,
            icon: '➕',
            isClickable: false
          });
        }
      } else if (routeMap[currentPath]) {
        breadcrumbs.push({
          name: routeMap[currentPath].name,
          path: currentPath,
          icon: routeMap[currentPath].icon,
          isClickable: true
        });
      } else {
        // Fallback for unknown routes
        breadcrumbs.push({
          name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
          path: currentPath,
          icon: '📄',
          isClickable: false
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on the main dashboard
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center space-x-1">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          
          <Button
            variant={breadcrumb.isClickable ? "ghost" : "ghost"}
            size="sm"
            onClick={() => breadcrumb.isClickable && navigate(breadcrumb.path)}
            className={`px-2 py-1 h-auto text-sm font-normal ${
              breadcrumb.isClickable 
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
                : 'text-gray-400 cursor-default'
            }`}
            disabled={!breadcrumb.isClickable}
          >
            <span className="mr-1">{breadcrumb.icon}</span>
            {breadcrumb.name}
          </Button>
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
