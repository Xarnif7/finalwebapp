import React, { useState } from 'react';
import { Search, Filter, Calendar, Tag, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const EnhancedFilters = ({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusChange, 
  sourceFilter, 
  onSourceChange,
  tagFilter,
  onTagChange,
  dateRange,
  onDateRangeChange,
  onClearFilters 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' }
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'manual', label: 'Manual' },
    { value: 'csv', label: 'CSV Import' },
    { value: 'zapier', label: 'Zapier' }
  ];

  const tagOptions = [
    { value: 'all', label: 'All Tags' },
    { value: 'vip', label: 'VIP' },
    { value: 'new', label: 'New' },
    { value: 'returning', label: 'Returning' }
  ];

  const activeFiltersCount = [
    statusFilter !== 'all',
    sourceFilter !== 'all', 
    tagFilter !== 'all',
    dateRange.from || dateRange.to
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Database className="h-4 w-4 inline mr-1" />
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => onSourceChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sourceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Tag
              </label>
              <select
                value={tagFilter}
                onChange={(e) => onTagChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tagOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                  className="text-sm"
                />
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-slate-600 hover:text-slate-800"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedFilters;
