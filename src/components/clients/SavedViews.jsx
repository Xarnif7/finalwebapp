import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, FileText, AlertTriangle, Crown, Filter } from 'lucide-react';

const SavedViews = ({ activeView, onViewChange }) => {
  const views = [
    {
      id: 'all',
      label: 'All Customers',
      icon: Users,
      count: null,
      color: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    },
    {
      id: 'new-this-week',
      label: 'New This Week',
      icon: Calendar,
      count: null,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    {
      id: 'needs-review',
      label: 'Needs Review',
      icon: AlertTriangle,
      count: null,
      color: 'bg-amber-100 text-amber-700 hover:bg-amber-200'
    },
    {
      id: 'imported-csv',
      label: 'Imported via CSV',
      icon: FileText,
      count: null,
      color: 'bg-green-100 text-green-700 hover:bg-green-200'
    },
    {
      id: 'bounced-invalid',
      label: 'Bounced/Invalid',
      icon: AlertTriangle,
      count: null,
      color: 'bg-red-100 text-red-700 hover:bg-red-200'
    },
    {
      id: 'vip',
      label: 'VIP',
      icon: Crown,
      count: null,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {views.map((view) => {
        const Icon = view.icon;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${view.color} ${
              activeView === view.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{view.label}</span>
            {view.count !== null && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {view.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SavedViews;
