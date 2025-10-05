import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Clock, Mail, MessageSquare, ArrowRight, Settings, Trash2, Play, Loader2 } from "lucide-react";
import { toast } from 'sonner';

export default function FlowCard({ 
  template, 
  sequence, // Support both template and sequence props
  onToggle, 
  onCustomize, 
  onTest, 
  onEdit,
  onDelete,
  onTestSend, // New prop for test sending
  updating = false 
}) {
  // Use template if provided, otherwise use sequence
  const data = template || sequence;
  const [sendingNow, setSendingNow] = useState(false);
  const getChannelIcon = (channel) => {
    return channel === 'sms' 
      ? <MessageSquare className="w-4 h-4 text-blue-600" /> 
      : <Mail className="w-4 h-4 text-green-600" />;
  };

  const getChannelColor = (channel) => {
    return channel === 'sms' 
      ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700' 
      : 'border-green-200 bg-gradient-to-r from-green-50 to-green-100 text-green-700';
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-500 hover:from-green-600 hover:to-green-700';
      case 'paused': return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-500 hover:from-yellow-600 hover:to-yellow-700';
      case 'draft': return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-500 hover:from-gray-600 hover:to-gray-700';
      case 'ready': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 hover:from-blue-600 hover:to-blue-700';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-500 hover:from-gray-600 hover:to-gray-700';
    }
  };

  const getTemplateDescription = (key, data) => {
    // Get actual delay from config
    const delayHours = data.config_json?.delay_hours || 0;
    const delayDays = data.config_json?.delay_days || 0;
    
    // Get channels
    const channels = data.channels || ['email'];
    const channelNames = channels.map(ch => ch === 'sms' ? 'SMS' : 'Email');
    
    // Format delay text
    let delayText = '';
    if (delayDays > 0) {
      delayText = delayDays === 1 ? '1 day' : `${delayDays} days`;
    }
    if (delayHours > 0) {
      if (delayText) {
        delayText += ` ${delayHours === 1 ? '1 hour' : `${delayHours} hours`}`;
      } else {
        delayText = delayHours === 1 ? '1 hour' : `${delayHours} hours`;
      }
    }
    if (!delayText) {
      delayText = 'immediately';
    }
    
    // Format trigger text
    // Use friendly names for standard keys; fall back to template name for custom keys
    const standardTriggers = {
      invoice_paid: 'Invoice Paid',
      job_completed: 'Job Completed',
      service_reminder: 'Service Reminder'
    };
    const triggerText = standardTriggers[key] || (data?.name || 'Event');
    
    // Generate smart description based on settings
    if (channels.length === 1) {
      return `Sends ${(channelNames[0] || 'email').toLowerCase()} ${delayText} after ${triggerText}.`;
    } else {
      // Multi-channel sequence
      const channelList = (channelNames || ['email']).join(' and ');
      return `Sends ${channelList.toLowerCase()} sequence ${delayText} after ${triggerText}.`;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="pt-10 pb-8 px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {data.name}
            </h3>
            <p className="text-sm text-gray-500">
              {formatTimeAgo(data.updated_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(data.status)} text-xs font-medium`}>
              {data.status}
            </Badge>
            <Switch 
              checked={data.status === 'active'} 
              onCheckedChange={(checked) => onToggle(checked ? 'active' : 'paused')}
              disabled={updating}
              className={`${data.status === 'active' 
                ? 'data-[state=checked]:bg-green-500 hover:data-[state=checked]:bg-green-600' 
                : 'data-[state=unchecked]:bg-yellow-500 hover:data-[state=unchecked]:bg-yellow-600'
              } transition-all duration-200`}
            />
          </div>
        </div>

        {/* Visual Flow */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Trigger */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow-sm">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Trigger</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            {/* Steps */}
            {data.channels?.map((channel, index) => {
              // Get delay from config_json
              let stepDelay = 0;
              let delayUnit = 'hours';
              
              if (data.config_json?.steps?.[index]?.delay) {
                stepDelay = data.config_json.steps[index].delay;
                delayUnit = data.config_json.steps[index].delayUnit || 'hours';
              } else if (index > 0 && data.config_json?.delay_hours) {
                stepDelay = data.config_json.delay_hours;
                delayUnit = 'hours';
              } else if (index > 0 && data.config_json?.delay_days) {
                stepDelay = data.config_json.delay_days;
                delayUnit = 'days';
              } else if (index > 0) {
                // Default delays based on template type
                const defaultDelays = {
                  'job_completed': 24,
                  'invoice_paid': 48,
                  'service_reminder': 1
                };
                stepDelay = defaultDelays[data.key] || 24;
                delayUnit = data.key === 'service_reminder' ? 'days' : 'hours';
              }
              
              return (
                <React.Fragment key={index}>
                  {/* Delay indicator for non-first steps */}
                  {index > 0 && stepDelay > 0 && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg shadow-sm">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">
                          {delayUnit === 'hours' ? `${stepDelay}h` : 
                           delayUnit === 'days' ? `${stepDelay}d` : 
                           `${stepDelay}m`}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </>
                  )}
                  
                  {/* Channel */}
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg shadow-sm ${getChannelColor(channel)}`}>
                    {getChannelIcon(channel)}
                    <span className="text-sm font-medium">
                      {channel === 'sms' ? 'SMS' : 'Email'}
                    </span>
                  </div>
                  
                  {index < data.channels.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 line-clamp-2">
            {getTemplateDescription(data.key, data) || data.description || data.config_json?.message || 'Automated follow-up sequence'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onCustomize(data)}
            className="flex-1 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Customize
          </Button>
          {onTestSend && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onTestSend(data)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Send
            </Button>
          )}
          {onEdit && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onEdit(data)}
              className="hover:bg-gray-100 transition-all duration-200"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDelete(data.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
