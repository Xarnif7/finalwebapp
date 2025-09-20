import React from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Copy, 
  Edit, 
  Archive,
  Mail,
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Settings,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import { useSequenceAnalytics } from '../../hooks/useSequenceAnalytics';
import { useSafetyRules } from '../../hooks/useSafetyRules';
import SafetyRulesSummary from './SafetyRulesSummary';
import { toast } from 'sonner';

const SequenceDetailsDrawer = ({ 
  sequence, 
  isOpen, 
  onClose, 
  onPause, 
  onResume, 
  onDuplicate, 
  onArchive, 
  onEdit 
}) => {
  const { analytics, loading, error } = useSequenceAnalytics(sequence?.id);
  const { safetyRules, loading: safetyLoading, error: safetyError } = useSafetyRules();

  if (!isOpen || !sequence) return null;

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'pause':
          await onPause(sequence.id);
          break;
        case 'resume':
          await onResume(sequence.id);
          break;
        case 'duplicate':
          await onDuplicate(sequence.id);
          break;
        case 'archive':
          await onArchive(sequence.id);
          break;
        case 'edit':
          onEdit(sequence);
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error(`Failed to ${action} sequence: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'archived':
        return <Archive className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStepIcon = (kind) => {
    switch (kind) {
      case 'send_email':
        return <Mail className="w-4 h-4" />;
      case 'send_sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'wait':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const formatWaitTime = (waitMs) => {
    if (!waitMs) return '0m';
    const minutes = Math.round(waitMs / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{sequence.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sequence.status)}`}>
                    {getStatusIcon(sequence.status)}
                    {sequence.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {sequence.trigger_event_type?.replace('_', ' ') || 'Manual'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">Error loading analytics: {error}</p>
              </div>
            ) : analytics ? (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Total Enrolled</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {analytics.enrollment_totals.total}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Completed</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {analytics.enrollment_totals.completed}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Active</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {analytics.enrollment_totals.active}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Conversion</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {analytics.conversion_rate}%
                    </div>
                  </div>
                </div>

                {/* Message Analytics */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Message Analytics
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analytics.message_totals.total}
                      </div>
                      <div className="text-sm text-gray-600">Total Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analytics.message_totals.last_7_days}
                      </div>
                      <div className="text-sm text-gray-600">Last 7 Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {analytics.message_totals.last_30_days}
                      </div>
                      <div className="text-sm text-gray-600">Last 30 Days</div>
                    </div>
                  </div>
                </div>

                {/* Step Analytics */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Step Performance
                  </h3>
                  <div className="space-y-3">
                    {analytics.step_analytics.map((step, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {getStepIcon(step.kind)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {step.kind === 'wait' ? 'Wait' : step.kind.replace('send_', 'Send ')}
                            </div>
                            {step.kind === 'wait' && (
                              <div className="text-sm text-gray-500">
                                {formatWaitTime(step.wait_ms)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {step.messages_sent}
                          </div>
                          <div className="text-sm text-gray-500">sent</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Settings
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Manual Enrollment</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        analytics.sequence.allow_manual_enroll 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {analytics.sequence.allow_manual_enroll ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Quiet Hours</span>
                      <span className="text-sm text-gray-900">
                        {analytics.quiet_hours.enabled 
                          ? `${analytics.quiet_hours.start} - ${analytics.quiet_hours.end}`
                          : 'Disabled'
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rate Limit (Hour)</span>
                      <span className="text-sm text-gray-900">
                        {analytics.rate_limits.per_hour}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rate Limit (Day)</span>
                      <span className="text-sm text-gray-900">
                        {analytics.rate_limits.per_day}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Last Activity
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatTimeAgo(analytics.last_activity)}
                  </p>
                </div>

                {/* Safety Rules Summary */}
                <SafetyRulesSummary 
                  safetyRules={safetyRules}
                  loading={safetyLoading}
                  error={safetyError}
                />
              </>
            ) : null}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAction(sequence.status === 'active' ? 'pause' : 'resume')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sequence.status === 'active'
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {sequence.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2 inline" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 inline" />
                      Resume
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleAction('duplicate')}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2 inline" />
                  Duplicate
                </button>
                
                <button
                  onClick={() => handleAction('edit')}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2 inline" />
                  Edit
                </button>
              </div>
              
              <button
                onClick={() => handleAction('archive')}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                <Archive className="w-4 h-4 mr-2 inline" />
                Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceDetailsDrawer;