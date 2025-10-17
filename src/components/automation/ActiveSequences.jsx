import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Mail, MessageSquare, ArrowRight, Play, Pause, Users, TrendingUp, AlertTriangle, Eye, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";

export default function ActiveSequences({ businessId, templates = [], sequences = [], onToggle }) {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [activeSequences, setActiveSequences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  useEffect(() => {
    if (businessId || business?.id) {
      loadPerformanceMetrics();
      
      // Set up real-time updates every 30 seconds
      const interval = setInterval(() => {
        loadPerformanceMetrics();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [businessId, business?.id]);

  // Use sequences prop if provided, otherwise filter from templates
  useEffect(() => {
    if (sequences && sequences.length > 0) {
      setActiveSequences(sequences);
    } else if (templates && templates.length > 0) {
      const active = templates.filter(template => template.status === 'active');
      setActiveSequences(active);
    } else {
      setActiveSequences([]);
    }
  }, [sequences, templates]);

  const loadActiveSequences = async () => {
    try {
      setLoading(true);
      
      // Only load from API if we don't have templates prop
      if (!templates || templates.length === 0) {
        const response = await fetch(`/api/templates/${business.id}`, {
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter for active sequences only
          setActiveSequences((data.templates || []).filter(template => template.status === 'active'));
        }
      } else {
        // Use templates prop if available
        const active = templates.filter(template => template.status === 'active');
        setActiveSequences(active);
        console.log('ActiveSequences using templates prop:', active.length);
      }
    } catch (error) {
      console.error('Error loading active sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch(`/api/automation/performance/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPerformanceMetrics(data.metrics || {});
      } else {
        // Mock data for demonstration
        setPerformanceMetrics({
          totalSent: 1247,
          totalDelivered: 1189,
          totalOpened: 892,
          totalClicked: 234,
          totalReviews: 156,
          deliveryRate: 95.3,
          openRate: 75.0,
          clickRate: 26.2,
          reviewRate: 17.5
        });
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
      // Mock data for demonstration
      setPerformanceMetrics({
        totalSent: 1247,
        totalDelivered: 1189,
        totalOpened: 892,
        totalClicked: 234,
        totalReviews: 156,
        deliveryRate: 95.3,
        openRate: 75.0,
        clickRate: 26.2,
        reviewRate: 17.5
      });
    }
  };

  const handleToggleSequence = async (sequence) => {
    if (!onToggle) {
      console.error('❌ No onToggle function provided');
      return;
    }
    
    const newStatus = sequence.status === 'active' ? 'paused' : 'active';
    await onToggle(sequence.id, newStatus);
  };

  const getChannelIcon = (channel) => {
    return channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />;
  };

  const getChannelColor = (channel) => {
    return channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  };

  const generateSequenceDescription = (sequence) => {
    // Get actual delay from config (same logic as FlowCard)
    const delayHours = sequence.config_json?.delay_hours || 0;
    const delayDays = sequence.config_json?.delay_days || 0;
    
    // Get channels
    const channels = sequence.channels || ['email'];
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
    const triggerEvent = sequence.key || sequence.trigger_type || 'event';
    const triggerText = (triggerEvent || 'event').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Generate smart description based on settings
    if (channels.length === 1) {
      return `Sends ${(channelNames[0] || 'email').toLowerCase()} ${delayText} after ${triggerText}.`;
    } else {
      // Multi-channel sequence
      const channelList = (channelNames || ['email']).join(' and ');
      return `Sends ${channelList.toLowerCase()} sequence ${delayText} after ${triggerText}.`;
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Active Sequences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-slate-500 text-sm">Loading active sequences...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            Active Sequences
          </CardTitle>
          <p className="text-sm text-slate-600">
            Currently running automation sequences that are actively engaging your customers.
          </p>
        </CardHeader>
      <CardContent>
        {activeSequences.length === 0 ? (
          <div className="text-center py-8">
            <Pause className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No active sequences</h3>
            <p className="text-slate-500 mb-4">Start an automation sequence to see it here.</p>
            <Button onClick={() => window.location.href = '/automations'}>
              Create Sequence
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSequences.map((sequence) => (
              <div key={sequence.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900 mb-1">
                      {sequence.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {generateSequenceDescription(sequence)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white border-green-500 hover:bg-green-500 hover:text-white text-xs">
                      Active
                    </Badge>
                    <Switch 
                      checked={sequence.status === 'active'} 
                      onCheckedChange={() => handleToggleSequence(sequence)}
                      disabled={updating[sequence.id]}
                      className={`transition-all duration-200 ${
                        sequence.status === 'active' 
                          ? 'data-[state=checked]:bg-green-500 hover:data-[state=checked]:bg-green-600 data-[state=checked]:border-green-500' 
                          : 'data-[state=unchecked]:bg-yellow-500 hover:data-[state=unchecked]:bg-yellow-600 data-[state=unchecked]:border-yellow-500'
                      }`}
                      style={{
                        '--switch-bg': sequence.status === 'active' ? '#10b981' : '#eab308',
                        '--switch-bg-hover': sequence.status === 'active' ? '#059669' : '#ca8a04'
                      }}
                    />
                  </div>
                </div>

                {/* Channels */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-600">Channels:</span>
                  {sequence.channels.map((channel, index) => (
                    <div key={index} className={`flex items-center gap-1 px-2 py-1 rounded ${getChannelColor(channel)}`}>
                      {getChannelIcon(channel)}
                      <span className="text-xs font-medium">
                        {channel === 'sms' ? 'SMS' : 'Email'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Visual Flow */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    <CheckCircle className="w-3 h-3" />
                    <span>Trigger</span>
                  </div>
                  
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  
                  {sequence.channels.map((channel, index) => {
                    const stepDelay = sequence.config_json?.steps?.[index]?.delay || 
                                     (index > 0 ? sequence.config_json?.delay_hours ?? 24 : 0);
                    const delayUnit = sequence.config_json?.steps?.[index]?.delayUnit || 'hours';
                    
                    return (
                      <React.Fragment key={index}>
                        {/* Delay indicator for non-first steps */}
                        {index > 0 && stepDelay > 0 && (
                          <>
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                              <Clock className="w-3 h-3" />
                              <span>
                                {delayUnit === 'hours' ? `${stepDelay}h` : 
                                 delayUnit === 'days' ? `${stepDelay}d` : 
                                 `${stepDelay}m`}
                              </span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                          </>
                        )}
                        
                        {/* Channel */}
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getChannelColor(channel)}`}>
                          {getChannelIcon(channel)}
                          <span>{channel === 'sms' ? 'SMS' : 'Email'}</span>
                        </div>
                        
                        {index < sequence.channels.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
}
