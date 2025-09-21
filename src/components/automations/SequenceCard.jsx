import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Play, 
  Pause, 
  Edit, 
  Copy, 
  Archive, 
  Trash2, 
  MoreVertical,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';

const SequenceCard = ({ 
  sequence, 
  onView, 
  onEdit, 
  onPause, 
  onResume, 
  onDuplicate, 
  onArchive, 
  onDelete 
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatNextRun = (nextRun) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-slate-900">{sequence.name}</h3>
            {getStatusBadge(sequence.status)}
          </div>
          <p className="text-sm text-slate-600 mb-3">{sequence.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Next Run:</span>
              <span className="font-medium">{formatNextRun(sequence.next_run)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Recipients:</span>
              <span className="font-medium">{sequence.recipient_count || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">Success Rate:</span>
              <span className="font-medium">{sequence.success_rate || '0%'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Last Sent:</span>
              <span className="font-medium">{sequence.last_sent ? new Date(sequence.last_sent).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            Customize
          </Button>
          
          {sequence.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
              className="text-green-600 hover:text-green-700"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            className="text-blue-600 hover:text-blue-700"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            className="text-orange-600 hover:text-orange-700"
          >
            <Archive className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SequenceCard;
