import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Play,
  Loader2
} from 'lucide-react';
import { useAutomationLogs } from '../../hooks/useAutomationLogs';

const ActivityFeed = ({ onViewSequence, onViewCustomer, onViewAll }) => {
  const [filter, setFilter] = useState('all');
  const { logs, loading, error, refetch } = useAutomationLogs();

  const filters = [
    { id: 'all', label: 'All', count: logs.length },
    { id: 'email', label: 'Email', count: logs.filter(log => log.channel === 'email').length },
    { id: 'sms', label: 'SMS', count: logs.filter(log => log.channel === 'sms').length },
    { id: 'errors', label: 'Errors', count: logs.filter(log => log.event_type === 'error').length }
  ];

  const getEventIcon = (eventType, channel) => {
    switch (eventType) {
      case 'message_sent':
        return channel === 'email' ? Mail : MessageSquare;
      case 'message_delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'message_failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'enrollment_created':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'sequence_started':
        return <Play className="h-4 w-4 text-purple-600" />;
      case 'quiet_hours_skipped':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'unsubscribed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'bounced':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'message_sent':
        return 'bg-blue-100 text-blue-800';
      case 'message_delivered':
        return 'bg-green-100 text-green-800';
      case 'message_failed':
        return 'bg-red-100 text-red-800';
      case 'enrollment_created':
        return 'bg-purple-100 text-purple-800';
      case 'sequence_started':
        return 'bg-indigo-100 text-indigo-800';
      case 'quiet_hours_skipped':
        return 'bg-orange-100 text-orange-800';
      case 'unsubscribed':
        return 'bg-red-100 text-red-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getEventDescription = (log) => {
    const { event_type, channel, sequence_name, customer_email, customer_phone, details } = log;
    
    switch (event_type) {
      case 'message_sent':
        return `Sent ${channel} to ${customer_email || customer_phone}`;
      case 'message_delivered':
        return `Delivered ${channel} to ${customer_email || customer_phone}`;
      case 'message_failed':
        return `Failed to send ${channel} to ${customer_email || customer_phone}`;
      case 'enrollment_created':
        return `Enrolled ${customer_email || customer_phone} in ${sequence_name}`;
      case 'sequence_started':
        return `Started sequence "${sequence_name}" for ${customer_email || customer_phone}`;
      case 'quiet_hours_skipped':
        return `Skipped ${channel} during quiet hours for ${customer_email || customer_phone}`;
      case 'unsubscribed':
        return `${customer_email || customer_phone} unsubscribed`;
      case 'bounced':
        return `${channel} bounced for ${customer_email || customer_phone}`;
      case 'error':
        return `Error: ${details?.error || 'Unknown error'}`;
      default:
        return `${event_type} for ${customer_email || customer_phone}`;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'email') return log.channel === 'email';
    if (filter === 'sms') return log.channel === 'sms';
    if (filter === 'errors') return log.event_type === 'error';
    return true;
  }).slice(0, 15); // Show only the most recent 15 events

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">Error loading activity</div>
          <div className="text-sm text-red-500">Please try refreshing the page</div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (filteredLogs.length === 0) {
    return (
      <div className="text-center py-12 border border-slate-200 rounded-lg bg-slate-50">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {filter === 'all' ? 'No recent activity yet' : `No ${filter} events found`}
        </h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          {filter === 'all' 
            ? 'Once your sequences start running, you\'ll see activity here including sent messages, enrollments, and completions.' 
            : `No ${filter} events found in the recent activity. Try a different filter or check back later.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {filter !== 'all' && (
            <Button
              variant="outline"
              onClick={() => setFilter('all')}
              className="text-slate-600 hover:text-slate-800"
            >
              View All Activity
            </Button>
          )}
          {filter === 'all' && (
            <Button
              onClick={onViewAll}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Create Your First Sequence
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filterOption) => (
          <Button
            key={filterOption.id}
            variant={filter === filterOption.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filterOption.id)}
            className={`text-xs ${
              filter === filterOption.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {filterOption.label}
            {filterOption.count > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 text-xs"
              >
                {filterOption.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const Icon = getEventIcon(log.event_type, log.channel);
          
          return (
            <Card 
              key={log.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (log.sequence_id && onViewSequence) {
                  onViewSequence(log.sequence_id);
                } else if (log.customer_id && onViewCustomer) {
                  onViewCustomer(log.customer_id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    {Icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getEventColor(log.event_type)}`}
                      >
                        {log.event_type.replace('_', ' ')}
                      </Badge>
                      {log.sequence_name && (
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {log.sequence_name}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 truncate">
                      {getEventDescription(log)}
                    </p>
                    
                    {log.details?.error && (
                      <p className="text-xs text-red-600 mt-1 truncate">
                        {log.details.error}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    {formatTimestamp(log.created_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More Button */}
      {filteredLogs.length >= 20 && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="text-slate-600 hover:text-slate-800"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh Activity
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
