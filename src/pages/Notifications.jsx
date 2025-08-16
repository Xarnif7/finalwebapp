import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Bell,
  Search,
  Star,
  MessageSquare,
  Users,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Archive,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/components/lib/utils';

const mockNotifications = [
  {
    id: 1,
    title: 'New 5-star review from Sarah Johnson',
    description: 'Great experience with the dental cleaning service!',
    type: 'review',
    time: '2 minutes ago',
    unread: true,
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    link: 'ReviewInbox',
    data: { reviewId: 'rev_123' }
  },
  {
    id: 2,
    title: 'Review request sent to 12 customers',
    description: 'Automated sequence completed successfully',
    type: 'automation',
    time: '1 hour ago',
    unread: true,
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    link: 'AutomatedRequests',
    data: { sequenceId: 'seq_456' }
  },
  {
    id: 3,
    title: 'New customer added: Michael Chen',
    description: 'Customer profile created and welcome email sent',
    type: 'customer',
    time: '3 hours ago',
    unread: false,
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    link: 'Clients',
    data: { customerId: 'cust_789' }
  },
  {
    id: 4,
    title: 'SMS message received',
    description: 'Reply from Emily Rodriguez about appointment',
    type: 'message',
    time: '5 hours ago',
    unread: false,
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    link: 'Conversations',
    data: { conversationId: 'conv_101' }
  },
  {
    id: 5,
    title: 'Competitor rating change detected',
    description: 'SmileCare Dental average rating increased to 4.3',
    type: 'competitor',
    time: '1 day ago',
    unread: false,
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    link: 'Competitors',
    data: { competitorId: 'comp_202' }
  },
  {
    id: 6,
    title: 'Integration sync completed',
    description: 'Square POS data synchronized successfully',
    type: 'integration',
    time: '1 day ago',
    unread: false,
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    link: 'Integrations',
    data: { integrationId: 'int_303' }
  },
  {
    id: 7,
    title: 'Monthly report ready',
    description: 'Your October performance report is now available',
    type: 'report',
    time: '2 days ago',
    unread: false,
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    link: 'RevenueImpact',
    data: { reportId: 'rep_404' }
  },
  {
    id: 8,
    title: 'Payment method expiring soon',
    description: 'Your credit card ending in 1234 expires next month',
    type: 'billing',
    time: '3 days ago',
    unread: false,
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    link: 'Settings?tab=billing',
    data: { paymentMethodId: 'pm_505' }
  }
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter(n => n.unread).length;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && notification.unread) ||
                         (filter === 'read' && !notification.unread);
    return matchesSearch && matchesFilter;
  });

  const handleNotificationClick = (notification) => {
    // Mark as read
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, unread: false } : n
    ));

    // Navigate to relevant page
    navigate(createPageUrl(notification.link));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const archiveNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="section-spacing">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="page-subtitle">Stay updated with all your business activities</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate(createPageUrl('AuditLog'))}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Audit Log
            </Button>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              <Button
                variant={filter === 'read' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('read')}
              >
                Read ({notifications.length - unreadCount})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'All caught up! Check back later for updates.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    'p-6 hover:bg-slate-50 transition-colors cursor-pointer group relative',
                    notification.unread && 'bg-blue-50/50 border-l-4 border-l-blue-500'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      notification.bgColor
                    )}>
                      <notification.icon className={cn('w-6 h-6', notification.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={cn(
                            'font-semibold text-gray-900 mb-1',
                            notification.unread && 'text-blue-900'
                          )}>
                            {notification.title}
                            {notification.unread && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                            )}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {notification.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{notification.time}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}