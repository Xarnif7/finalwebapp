import React from 'react';
import { CheckCircle, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ZapierStatusPill = ({ onViewZaps, lastSync }) => {
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffInHours = Math.floor((now - syncTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium text-green-800">Connected</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-sm text-green-700">
          <Clock className="h-4 w-4" />
          <span>Last sync {formatLastSync(lastSync)}</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewZaps}
          className="text-green-700 hover:text-green-800 hover:bg-green-100 h-8 px-3"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View my Zaps
        </Button>
      </div>
    </div>
  );
};

export default ZapierStatusPill;
