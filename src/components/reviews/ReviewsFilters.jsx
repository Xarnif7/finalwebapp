import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  User,
  Tag,
  Star,
  MessageSquare
} from 'lucide-react';

const platformConfig = {
  google: { name: 'Google', icon: '🔍', color: 'bg-blue-100 text-blue-800' },
  facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-600' },
  yelp: { name: 'Yelp', icon: '🔴', color: 'bg-red-100 text-red-800' },
  bbb: { name: 'BBB', icon: '🏆', color: 'bg-yellow-100 text-yellow-800' }
};

const statusConfig = {
  all: { name: 'All Reviews', color: 'bg-gray-100 text-gray-800' },
  unread: { name: 'Unread', color: 'bg-red-100 text-red-800' },
  needs_response: { name: 'Needs Response', color: 'bg-orange-100 text-orange-800' },
  responded: { name: 'Responded', color: 'bg-green-100 text-green-800' },
  resolved: { name: 'Resolved', color: 'bg-blue-100 text-blue-800' },
  edited_since_response: { name: 'Edited Since Response', color: 'bg-purple-100 text-purple-800' }
};

const sentimentConfig = {
  all: { name: 'All Sentiments', color: 'bg-gray-100 text-gray-800' },
  positive: { name: 'Positive', color: 'bg-green-100 text-green-800' },
  neutral: { name: 'Neutral', color: 'bg-yellow-100 text-yellow-800' },
  negative: { name: 'Negative', color: 'bg-red-100 text-red-800' }
};

export default function ReviewsFilters({ filters, onFiltersChange, onClearFilters }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customTags, setCustomTags] = useState('');
  const [customTopics, setCustomTopics] = useState('');

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleTagsChange = (value) => {
    setCustomTags(value);
    onFiltersChange({ ...filters, tags: value });
  };

  const handleTopicsChange = (value) => {
    setCustomTopics(value);
    onFiltersChange({ ...filters, topics: value });
  };

  const clearFilters = () => {
    setCustomTags('');
    setCustomTopics('');
    onClearFilters();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.platform !== 'all') count++;
    if (filters.rating !== 'all') count++;
    if (filters.sentiment !== 'all') count++;
    if (filters.assigned_to !== 'all') count++;
    if (filters.date_range !== 'all') count++;
    if (filters.search) count++;
    if (filters.tags) count++;
    if (filters.topics) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search reviews..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Status Filters */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusConfig).slice(0, 4).map(([key, config]) => (
              <Button
                key={key}
                variant={filters.status === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange('status', key)}
                className={`text-xs ${filters.status === key ? '' : 'border-gray-200'}`}
              >
                {config.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Platform Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Platform</label>
          <Select value={filters.platform || 'all'} onValueChange={(value) => handleFilterChange('platform', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {Object.entries(platformConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.icon} {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rating Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rating</label>
          <Select value={filters.rating || 'all'} onValueChange={(value) => handleFilterChange('rating', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
              <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
              <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
              <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
              <SelectItem value="1">⭐ 1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            {/* Sentiment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sentiment</label>
              <Select value={filters.sentiment || 'all'} onValueChange={(value) => handleFilterChange('sentiment', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sentimentConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assigned To</label>
              <Select value={filters.assigned_to || 'all'} onValueChange={(value) => handleFilterChange('assigned_to', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <Select value={filters.date_range || 'all'} onValueChange={(value) => handleFilterChange('date_range', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tags</label>
              <Input
                placeholder="installation, lawn care, hvac..."
                value={customTags}
                onChange={(e) => handleTagsChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">Comma-separated tags</p>
            </div>

            {/* Topics Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Topics</label>
              <Input
                placeholder="service quality, pricing, timeliness..."
                value={customTopics}
                onChange={(e) => handleTopicsChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">Comma-separated topics</p>
            </div>
          </>
        )}

        {/* Sort Options */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Sort By</label>
          <Select value={filters.sort_by || 'review_created_at'} onValueChange={(value) => handleFilterChange('sort_by', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="review_created_at">Newest First</SelectItem>
              <SelectItem value="rating">Highest Rating</SelectItem>
              <SelectItem value="due_at">Due Date</SelectItem>
              <SelectItem value="reviewer_name">Reviewer Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
