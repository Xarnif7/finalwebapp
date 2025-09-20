import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Play, 
  Pause, 
  Eye, 
  Edit, 
  Users, 
  Clock, 
  Mail, 
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useSequencesData } from '../../hooks/useSequencesData';

const MyActiveSequences = ({ onViewAll, onEdit, onPause, onResume }) => {
  const { sequences, loading, error } = useSequencesData();

  // Filter to only active sequences
  const activeSequences = sequences.filter(seq => seq.status === 'active');

  const getChannelIcon = (channel) => {
    return channel === 'email' ? Mail : MessageSquare;
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={variants[status] || variants.draft}>
        {status}
      </Badge>
    );
  };

  const formatLastSent = (lastSent) => {
    if (!lastSent) return 'Never';
    const date = new Date(lastSent);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const getEnrollmentRuleSummary = (sequence) => {
    if (sequence.trigger_event_type) {
      return `Triggers on ${sequence.trigger_event_type.replace('_', ' ')}`;
    }
    if (sequence.allow_manual_enroll) {
      return 'Manual enrollment allowed';
    }
    return 'No enrollment rule';
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="h-4 bg-slate-200 rounded w-32"></div>
        </div>
        <div className="divide-y divide-slate-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-slate-200 rounded w-48"></div>
                  <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-8 bg-slate-200 rounded w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                  <div className="h-8 bg-slate-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="text-red-600 mb-2">Error loading sequences</div>
          <div className="text-sm text-red-500">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (activeSequences.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-8 text-center">
          <Play className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No active sequences</h3>
          <p className="text-slate-600 mb-4">Create your first sequence to get started</p>
          <Button
            onClick={onViewAll}
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            Create Sequence
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold text-slate-700">Name</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Enrolled</TableHead>
            <TableHead className="font-semibold text-slate-700">Last Sent</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeSequences.slice(0, 5).map((sequence) => {
            const ChannelIcon = getChannelIcon(sequence.primary_channel || 'email');
            
            return (
              <TableRow key={sequence.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <ChannelIcon className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{sequence.name}</div>
                      <div className="text-xs text-slate-500">{getEnrollmentRuleSummary(sequence)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(sequence.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm text-slate-600">
                    <Users className="h-3 w-3" />
                    <span>{sequence.active_enrollments || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-slate-600">
                    {formatLastSent(sequence.last_sent_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      onClick={() => onPause && onPause(sequence.id)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => onEdit && onEdit(sequence)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => onEdit && onEdit(sequence)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-slate-600 border-slate-300 hover:bg-slate-50"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {activeSequences.length > 5 && (
        <div className="px-6 py-3 border-t border-slate-200 text-center">
          <Button
            onClick={onViewAll}
            variant="outline"
            size="sm"
            className="text-slate-600 border-slate-300 hover:bg-slate-50"
          >
            View all {activeSequences.length} sequences
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyActiveSequences;