import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Play, 
  Pause, 
  Copy, 
  Archive, 
  Edit,
  Mail,
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useSequencesData } from '../../hooks/useSequencesData';
import { toast } from 'sonner';
import SequenceDetailsDrawer from './SequenceDetailsDrawer';

const SequencesList = ({ onEdit }) => {
  const { 
    sequences, 
    loading, 
    error, 
    pauseSequence, 
    resumeSequence, 
    duplicateSequence, 
    archiveSequence 
  } = useSequencesData();

  const [actionLoading, setActionLoading] = useState({});
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const handleAction = async (action, sequenceId) => {
    setActionLoading(prev => ({ ...prev, [sequenceId]: action }));
    
    try {
      switch (action) {
        case 'pause':
          await pauseSequence(sequenceId);
          toast.success('Sequence paused successfully');
          break;
        case 'resume':
          await resumeSequence(sequenceId);
          toast.success('Sequence resumed successfully');
          break;
        case 'customize':
          // Open the sequence details drawer for customization
          setSelectedSequence(sequences.find(s => s.id === sequenceId));
          setShowDetailsDrawer(true);
          break;
        case 'duplicate':
          await duplicateSequence(sequenceId);
          toast.success('Sequence duplicated successfully');
          break;
        case 'archive':
          await archiveSequence(sequenceId);
          toast.success('Sequence archived successfully');
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error(`Failed to ${action} sequence: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [sequenceId]: null }));
    }
  };

  const handleSequenceClick = (sequence) => {
    setSelectedSequence(sequence);
    setShowDetailsDrawer(true);
  };

  const handleEdit = (sequence) => {
    if (onEdit) {
      onEdit(sequence);
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
        return <Mail className="w-3 h-3" />;
      case 'send_sms':
        return <MessageSquare className="w-3 h-3" />;
      case 'wait':
        return <Clock className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const formatStepSummary = (stepSummary) => {
    if (!stepSummary || stepSummary.length === 0) return 'No steps';
    
    return stepSummary.map((step, index) => (
      <div key={index} className="flex items-center gap-1 text-xs text-gray-500">
        {getStepIcon(step.kind)}
        <span>
          {step.kind === 'wait' 
            ? `${Math.round(step.wait_ms / 1000 / 60)}m`
            : step.kind.replace('send_', '')
          }
        </span>
        {index < stepSummary.length - 1 && <span>→</span>}
      </div>
    ));
  };

  const formatLastSent = (lastSent) => {
    if (!lastSent) return 'Never';
    
    const date = new Date(lastSent);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">Error loading sequences: {error}</p>
      </div>
    );
  }

  if (sequences.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Edit className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sequences yet</h3>
        <p className="text-gray-500 mb-6">Create your first automation sequence to get started.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Create Sequence
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {sequences.map((sequence) => (
          <div 
            key={sequence.id} 
            className="bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleSequenceClick(sequence)}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{sequence.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sequence.status)}`}>
                      {getStatusIcon(sequence.status)}
                      {sequence.status}
                    </span>
                  </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <div className="font-medium text-gray-900">Steps</div>
                    <div className="flex items-center gap-1 mt-1">
                      {formatStepSummary(sequence.step_summary)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">Enrollments</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span className="text-green-600">{sequence.active_enrollments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-blue-600">{sequence.finished_enrollments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span className="text-red-600">{sequence.stopped_enrollments}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">Trigger</div>
                    <div className="mt-1 capitalize">
                      {sequence.trigger_event_type?.replace('_', ' ') || 'Manual'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">Last Sent</div>
                    <div className="mt-1">
                      {formatLastSent(sequence.last_sent)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(sequence.status === 'active' ? 'pause' : 'resume', sequence.id);
                    }}
                    disabled={actionLoading[sequence.id] === 'pause' || actionLoading[sequence.id] === 'resume'}
                  >
                    {actionLoading[sequence.id] === 'pause' || actionLoading[sequence.id] === 'resume' ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : sequence.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('customize', sequence.id);
                    }}
                    disabled={actionLoading[sequence.id] === 'customize'}
                    title="Customize sequence"
                  >
                    {actionLoading[sequence.id] === 'customize' ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <Settings className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('duplicate', sequence.id);
                    }}
                    disabled={actionLoading[sequence.id] === 'duplicate'}
                    title="Duplicate sequence"
                  >
                    {actionLoading[sequence.id] === 'duplicate' ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('archive', sequence.id);
                    }}
                    disabled={actionLoading[sequence.id] === 'archive'}
                  >
                    {actionLoading[sequence.id] === 'archive' ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <div className="relative">
                  <button 
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(sequence);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Sequence Details Drawer */}
      <SequenceDetailsDrawer
        sequence={selectedSequence}
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        onPause={pauseSequence}
        onResume={resumeSequence}
        onDuplicate={duplicateSequence}
        onArchive={archiveSequence}
        onEdit={handleEdit}
      />
      </div>
    </div>
  );
};

export default SequencesList;
