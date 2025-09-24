import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User, 
  Calendar,
  Phone,
  Mail,
  Tag,
  MessageSquare,
  Eye,
  ExternalLink,
  Flag
} from 'lucide-react';

const priorityConfig = {
  low: { name: 'Low', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  medium: { name: 'Medium', color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { name: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  urgent: { name: 'Urgent', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

const statusConfig = {
  open: { name: 'Open', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  in_progress: { name: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  resolved: { name: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { name: 'Closed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle }
};

const getTimeAgo = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
};

const FeedbackCaseCard = ({ case_, isSelected, onSelect, onAction }) => {
  const priority = priorityConfig[case_.priority] || priorityConfig.medium;
  const status = statusConfig[case_.status] || statusConfig.open;
  const PriorityIcon = priority.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      onClick={() => onSelect(case_)}
    >
      <Card className={`hover:shadow-lg transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:border-gray-300'
      }`}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-xs ${priority.color}`}>
                <PriorityIcon className="w-3 h-3 mr-1" />
                {priority.name}
              </Badge>
              <Badge variant="outline" className={`text-xs ${status.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Calendar className="w-3 h-3" />
              {getTimeAgo(case_.created_at)}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
            {case_.title}
          </h3>

          {/* Description */}
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {case_.description}
          </p>

          {/* Customer Info */}
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {case_.customer_name}
            </div>
            {case_.customer_email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {case_.customer_email}
              </div>
            )}
            {case_.customer_phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {case_.customer_phone}
              </div>
            )}
          </div>

          {/* Tags */}
          {case_.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {case_.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {case_.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{case_.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-500 text-sm">
              {case_.contact_count > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {case_.contact_count} contacts
                </div>
              )}
              {case_.review_id && (
                <div className="flex items-center gap-1">
                  <Flag className="w-3 h-3" />
                  From review
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {case_.review_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(case_, 'view_review');
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(case_, 'menu');
                }}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function FeedbackCasesList({ 
  businessId,
  selectedCase, 
  onSelectCase, 
  onAction,
  loading = false 
}) {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    if (businessId) {
      loadCases();
    }
  }, [businessId]);

  const loadCases = async () => {
    try {
      const response = await fetch(`/api/feedback/cases?business_id=${businessId}`);
      const data = await response.json();
      setCases(data.cases || []);
    } catch (error) {
      console.error('Error loading feedback cases:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <CardContent className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback cases</h3>
          <p className="text-gray-500">
            Escalated reviews and feedback will appear here for resolution.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((case_) => (
        <FeedbackCaseCard
          key={case_.id}
          case_={case_}
          isSelected={selectedCase?.id === case_.id}
          onSelect={onSelectCase}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
