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

  // Define sub-route mappings for better breadcrumbs
  const subRouteMap = {
    'active-sequences': { name: 'Active Sequences', icon: '📋' },
    'draft-sequences': { name: 'Draft Sequences', icon: '📝' },
    'completed-sequences': { name: 'Completed Sequences', icon: '✅' },
    'templates': { name: 'Templates', icon: '📝' },
    'create-template': { name: 'Create Template', icon: '➕' },
    'edit-template': { name: 'Edit Template', icon: '✏️' },
    'customer-details': { name: 'Customer Details', icon: '👤' },
    'add-customer': { name: 'Add Customer', icon: '➕' },
    'import-customers': { name: 'Import Customers', icon: '📥' },
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
      
      // Handle sub-routes first
      if (subRouteMap[segment]) {
        breadcrumbs.push({
          name: subRouteMap[segment].name,
          path: currentPath,
          icon: subRouteMap[segment].icon,
          isClickable: true
        });
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
                ? 'text-gray-800 hover:text-gray-900 hover:bg-gray-100' 
                : 'text-gray-600 cursor-default'
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
