import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  Zap, 
  Plus, 
  Trash2, 
  ArrowRight,
  GripVertical
} from 'lucide-react';

const FlowBuilder = ({ selectedChannels = [], onFlowChange, initialFlow = [], aiTimingEnabled = false }) => {
  const [flowSteps, setFlowSteps] = useState(initialFlow);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [timingStepIndex, setTimingStepIndex] = useState(null);
  const [tempTiming, setTempTiming] = useState({ value: 1, unit: 'hours' });
  const flowAreaRef = useRef(null);

  console.log('FlowBuilder rendered with:', { selectedChannels, initialFlow });

  // Available draggable items based on selected channels
  const draggableItems = [
    { id: 'trigger', icon: Zap, label: 'Trigger', color: 'bg-purple-500', type: 'trigger' },
    ...(selectedChannels.includes('email') ? [{ id: 'email', icon: Mail, label: 'Email', color: 'bg-blue-500', type: 'email' }] : []),
    ...(selectedChannels.includes('sms') ? [{ id: 'sms', icon: MessageSquare, label: 'SMS', color: 'bg-green-500', type: 'sms' }] : []),
  ];

  console.log('Draggable items:', draggableItems);

  useEffect(() => {
    onFlowChange(flowSteps);
  }, [flowSteps, onFlowChange]);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newStep = {
      id: Date.now(),
      type: draggedItem.type,
      label: draggedItem.label,
      icon: draggedItem.icon,
      color: draggedItem.color,
      timing: null
    };

    setFlowSteps(prev => [...prev, newStep]);
    setDraggedItem(null);
  };

  const handleStepClick = (stepIndex) => {
    if (stepIndex > 0) {
      setTimingStepIndex(stepIndex);
      setShowTimingModal(true);
    }
  };

  const handleTimingSave = () => {
    if (timingStepIndex !== null) {
      setFlowSteps(prev => prev.map((step, index) => 
        index === timingStepIndex 
          ? { ...step, timing: tempTiming }
          : step
      ));
    }
    setShowTimingModal(false);
    setTimingStepIndex(null);
    setTempTiming({ value: 1, unit: 'hours' });
  };

  const removeStep = (stepId) => {
    setFlowSteps(prev => prev.filter(step => step.id !== stepId));
  };

  const moveStep = (stepId, direction) => {
    const currentIndex = flowSteps.findIndex(step => step.id === stepId);
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < flowSteps.length - 1)
    ) {
      const newSteps = [...flowSteps];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newSteps[currentIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[currentIndex]];
      setFlowSteps(newSteps);
    }
  };

  const formatTiming = (timing) => {
    if (!timing) return '';
    return `${timing.value}${timing.unit === 'hours' ? 'h' : timing.unit === 'minutes' ? 'm' : 'd'}`;
  };

  return (
    <div className="space-y-6">
      {/* Draggable Items */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Drag items to build your flow:</h4>
        <div className="flex flex-wrap gap-2">
          {draggableItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-move hover:opacity-80 transition-opacity ${item.color} text-white text-sm font-medium`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow Area */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Your Flow:</h4>
        <div
          ref={flowAreaRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50"
        >
          {flowSteps.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <p className="text-sm">Drag items here to build your automation flow</p>
                <p className="text-xs text-gray-400 mt-1">Start with a trigger, then add your communication steps</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-4">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === flowSteps.length - 1;
                
                return (
                  <React.Fragment key={step.id}>
                    {/* Step */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <div
                          onClick={() => handleStepClick(index)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${step.color} text-white text-sm font-medium min-w-[80px] justify-center`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{step.label}</span>
                        </div>
                        
                        {/* Step Controls */}
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            {index > 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 w-6 p-0"
                                onClick={() => moveStep(step.id, 'up')}
                              >
                                ↑
                              </Button>
                            )}
                            {index < flowSteps.length - 1 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 w-6 p-0"
                                onClick={() => moveStep(step.id, 'down')}
                              >
                                ↓
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 w-6 p-0"
                              onClick={() => removeStep(step.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Timing Display */}
                      {step.timing && (
                        <div className="mt-2 text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                          {formatTiming(step.timing)}
                        </div>
                      )}
                    </div>
                    
                    {/* Arrow (except after last step) */}
                    {!isLast && (
                      <div className="flex items-center">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        {!step.timing && index > 0 && (
                          <div className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Click step to set timing
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Timing Modal */}
      <Dialog open={showTimingModal} onOpenChange={setShowTimingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Timing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              How long should the system wait before this step?
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={tempTiming.value}
                onChange={(e) => setTempTiming(prev => ({ ...prev, value: parseInt(e.target.value) || 1 }))}
                className="w-20"
              />
              <Select
                value={tempTiming.unit}
                onValueChange={(value) => setTempTiming(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleTimingSave} className="flex-1">
                Set Timing
              </Button>
              <Button variant="outline" onClick={() => setShowTimingModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowBuilder;
