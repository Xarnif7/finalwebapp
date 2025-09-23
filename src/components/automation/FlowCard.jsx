import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, Clock, Mail, MessageSquare, ArrowRight, Settings, Play, Pause } from "lucide-react";

export default function FlowCard({ 
  template, 
  sequence, // Support both template and sequence props
  onToggle, 
  onCustomize, 
  onTest, 
  onEdit,
  onDelete,
  updating = false 
}) {
  // Use template if provided, otherwise use sequence
  const data = template || sequence;
  const getChannelIcon = (channel) => {
    return channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const getChannelColor = (channel) => {
    return channel === 'sms' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50';
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
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'ready': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
    const triggerText = (key || 'event').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
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
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
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
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Trigger */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Trigger</span>
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
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg">
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
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${getChannelColor(channel)}`}>
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
        <div className="mb-4">
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
            className="flex-1"
          >
            <Settings className="w-3 h-3 mr-1" />
            Customize
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onTest(data)}
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            Test
          </Button>
          {onEdit && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onEdit(data)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDelete(data.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Pause className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
