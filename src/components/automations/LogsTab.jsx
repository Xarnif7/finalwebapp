import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar,
  Search,
  Filter,
  Clock,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  User,
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useAutomationLogs } from '../../hooks/useAutomationLogs';
import { useSequencesData } from '../../hooks/useSequencesData';
import { useCustomersData } from '../../hooks/useCustomersData';

const LogsTab = () => {
  const { logs, loading, error, refetch } = useAutomationLogs();
  const { sequences } = useSequencesData();
  const { customers } = useCustomersData();
  
  const [filters, setFilters] = useState({
    sequence: 'all',
    channel: 'all',
    status: 'all',
    dateRange: '7d',
    customerSearch: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredLogs = logs.filter(log => {
    // Sequence filter
    if (filters.sequence !== 'all' && log.sequence_id !== filters.sequence) {
      return false;
    }
    
    // Channel filter
    if (filters.channel !== 'all' && log.channel !== filters.channel) {
      return false;
    }
    
    // Status filter
    if (filters.status !== 'all' && log.status !== filters.status) {
      return false;
    }
    
    // Date range filter
    const logDate = new Date(log.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
    
    if (filters.dateRange === '1d' && daysDiff > 1) return false;
    if (filters.dateRange === '7d' && daysDiff > 7) return false;
    if (filters.dateRange === '30d' && daysDiff > 30) return false;
    
    // Customer search
    if (filters.customerSearch) {
      const searchTerm = filters.customerSearch.toLowerCase();
      const customer = customers.find(c => c.id === log.customer_id);
      if (!customer) return false;
      
      const matchesEmail = customer.email?.toLowerCase().includes(searchTerm);
      const matchesPhone = customer.phone?.toLowerCase().includes(searchTerm);
      const matchesName = `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm);
      
      if (!matchesEmail && !matchesPhone && !matchesName) return false;
    }
    
    return true;
  });

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'enrolled':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'step_ran':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'message_queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'message_sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'message_delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'message_failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'enrollment_stopped':
        return <Pause className="w-4 h-4 text-orange-500" />;
      case 'enrollment_finished':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'enrolled':
        return 'bg-blue-100 text-blue-800';
      case 'step_ran':
        return 'bg-green-100 text-green-800';
      case 'message_queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'message_sent':
        return 'bg-green-100 text-green-800';
      case 'message_delivered':
        return 'bg-green-100 text-green-800';
      case 'message_failed':
        return 'bg-red-100 text-red-800';
      case 'enrollment_stopped':
        return 'bg-orange-100 text-orange-800';
      case 'enrollment_finished':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSequenceName = (sequenceId) => {
    const sequence = sequences.find(s => s.id === sequenceId);
    return sequence ? sequence.name : 'Unknown Sequence';
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown Customer';
    return `${customer.first_name} ${customer.last_name}`;
  };

  const getCustomerEmail = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.email : 'No email';
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const handleSequenceClick = (sequenceId) => {
    // This would open the sequence drawer
    console.log('Open sequence:', sequenceId);
  };

  const handleCustomerClick = (customerId) => {
    // This would open the customer profile
    console.log('Open customer:', customerId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Automation Logs</h2>
          <p className="text-slate-600 mt-1">
            Monitor and debug your automation sequences
          </p>
        </div>
        <Button
          onClick={refetch}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Activity className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Sequence Filter */}
            <div>
              <Label htmlFor="sequence-filter">Sequence</Label>
              <Select
                value={filters.sequence}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sequence: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sequences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sequences</SelectItem>
                  {sequences.map(sequence => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      {sequence.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel Filter */}
            <div>
              <Label htmlFor="channel-filter">Channel</Label>
              <Select
                value={filters.channel}
                onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <Label htmlFor="date-filter">Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Search */}
            <div>
              <Label htmlFor="customer-search">Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="customer-search"
                  placeholder="Search by email, phone, or name"
                  value={filters.customerSearch}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerSearch: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No logs found
              </h3>
              <p className="text-gray-600">
                {filters.sequence !== 'all' || filters.channel !== 'all' || filters.status !== 'all' || filters.customerSearch
                  ? 'Try adjusting your filters to see more results'
                  : 'No automation events have been logged yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log, index) => (
            <Card 
              key={`${log.id}-${index}`} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleLogClick(log)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  {/* Event Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(log.event_type)}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getEventColor(log.event_type)}>
                          {log.event_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {log.channel && (
                          <div className="flex items-center space-x-1 text-gray-500">
                            {getChannelIcon(log.channel)}
                            <span className="text-sm capitalize">{log.channel}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimestamp(log.created_at)}</span>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-900">
                          {getSequenceName(log.sequence_id)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSequenceClick(log.sequence_id);
                          }}
                          className="h-6 px-2 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getCustomerName(log.customer_id)}
                        </span>
                        <span className="text-sm text-gray-400">
                          ({getCustomerEmail(log.customer_id)})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomerClick(log.customer_id);
                          }}
                          className="h-6 px-2 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Profile
                        </Button>
                      </div>

                      {log.message && (
                        <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          {log.message}
                        </div>
                      )}

                      {log.error && (
                        <div className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{log.error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Log Details</h2>
              <Button
                variant="ghost"
                onClick={() => setShowDetails(false)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Event Type</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getEventIcon(selectedLog.event_type)}
                    <Badge className={getEventColor(selectedLog.event_type)}>
                      {selectedLog.event_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Timestamp</Label>
                  <p className="text-sm mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sequence</Label>
                  <p className="text-sm mt-1">{getSequenceName(selectedLog.sequence_id)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <p className="text-sm mt-1">{getCustomerName(selectedLog.customer_id)}</p>
                </div>
              </div>

              {selectedLog.channel && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Channel</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getChannelIcon(selectedLog.channel)}
                    <span className="text-sm capitalize">{selectedLog.channel}</span>
                  </div>
                </div>
              )}

              {selectedLog.message && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Message</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded">{selectedLog.message}</p>
                </div>
              )}

              {selectedLog.error && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Error</Label>
                  <p className="text-sm mt-1 p-3 bg-red-50 text-red-600 rounded">{selectedLog.error}</p>
                </div>
              )}

              {selectedLog.payload && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Payload</Label>
                  <pre className="text-xs mt-1 p-3 bg-gray-50 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsTab;
