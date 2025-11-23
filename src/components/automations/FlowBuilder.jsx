import React, { useState, useRef, useEffect, Fragment } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Zap, 
  Trash2, 
  ArrowRight
} from 'lucide-react';
import { MESSAGE_TEMPLATES } from './MessageEditor';

const FlowBuilder = ({ selectedChannels = [], onFlowChange, initialFlow = [], aiTimingEnabled = false }) => {
  const [flowSteps, setFlowSteps] = useState(initialFlow);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const flowAreaRef = useRef(null);

  console.log('FlowBuilder rendered with:', { selectedChannels, initialFlow });

  // Available draggable items based on selected channels (no trigger - it's always pre-filled)
  const draggableItems = [
    ...(selectedChannels.includes('email') ? [{ id: 'email', icon: Mail, label: 'Email', color: 'bg-blue-500', type: 'email' }] : []),
    ...(selectedChannels.includes('sms') ? [{ id: 'sms', icon: MessageSquare, label: 'SMS', color: 'bg-green-500', type: 'sms' }] : []),
  ];

  console.log('Draggable items:', draggableItems);

  useEffect(() => {
    onFlowChange(flowSteps);
  }, [flowSteps, onFlowChange]);

  // Ensure trigger is always the first step
  useEffect(() => {
    if (flowSteps.length === 0 || flowSteps[0]?.type !== 'trigger') {
      const triggerStep = {
        id: 'trigger-required',
        type: 'trigger',
        label: 'Trigger',
        icon: Zap,
        color: 'bg-purple-500',
        timing: null
      };
      setFlowSteps(prev => [triggerStep, ...prev.filter(step => step.type !== 'trigger')]);
    }
  }, []);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for some browsers
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    const newStep = {
      id: Date.now(),
      type: draggedItem.type,
      label: draggedItem.label,
      icon: draggedItem.icon,
      color: draggedItem.color,
      timing: null
    };

    // If we have a specific drop index, insert there, otherwise add to end
    if (dragOverIndex !== null) {
      setFlowSteps(prev => {
        const newSteps = [...prev];
        newSteps.splice(dragOverIndex, 0, newStep);
        return newSteps;
      });
    } else {
      setFlowSteps(prev => [...prev, newStep]);
    }
    
    // Reset drag state
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const handleDropZoneDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDropZoneDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDropZoneDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    const newStep = {
      id: Date.now(),
      type: draggedItem.type,
      label: draggedItem.label,
      icon: draggedItem.icon,
      color: draggedItem.color,
      timing: null
    };

    setFlowSteps(prev => {
      const newSteps = [...prev];
      newSteps.splice(index, 0, newStep);
      return newSteps;
    });
    
    // Reset drag state
    setDraggedItem(null);
    setIsDragging(false);
    setDragOverIndex(null);
  };

  const removeStep = (stepId) => {
    // Prevent deleting trigger steps, but allow deleting other steps
    setFlowSteps(prev => prev.filter(step => step.id !== stepId || step.type === 'trigger'));
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

  return (
    <div className="space-y-6">
      {/* Draggable Items - Simplified */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-gray-700">Add Steps:</h4>
          {isDragging && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
              Drop to add step
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {draggableItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  // Also allow click to add
                  const newStep = {
                    id: Date.now(),
                    type: item.type,
                    label: item.label,
                    icon: item.icon,
                    color: item.color,
                    timing: null
                  };
                  setFlowSteps(prev => [...prev, newStep]);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-move hover:scale-105 active:scale-95 transition-all duration-200 ${item.color} text-white text-sm font-semibold shadow-md hover:shadow-lg`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flow Area - Cleaner Design */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Journey Steps:</h4>
          {flowSteps.length > 1 && (
            <span className="text-xs text-gray-500">{flowSteps.filter(s => s.type !== 'trigger').length} steps</span>
          )}
        </div>
        <div
          ref={flowAreaRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="min-h-[200px] border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50 hover:border-blue-300 transition-colors"
        >
          {flowSteps.length === 0 || (flowSteps.length === 1 && flowSteps[0]?.type === 'trigger') ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">Add steps to build your journey</p>
                <p className="text-xs text-gray-500 mt-1">Drag or click the buttons above to add steps</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                const isTrigger = step.type === 'trigger';
                
                return (
                  <Fragment key={step.id}>
                    {/* Drop Zone Before Step */}
                    {isDragging && (
                      <div
                        onDragOver={(e) => handleDropZoneDragOver(e, index)}
                        onDragLeave={handleDropZoneDragLeave}
                        onDrop={(e) => handleDropZoneDrop(e, index)}
                        className={`h-2 rounded transition-all duration-200 ${
                          dragOverIndex === index 
                            ? 'bg-blue-400 border-2 border-blue-500' 
                            : 'bg-transparent'
                        }`}
                      />
                    )}

                    {/* Step Card */}
                    <div className="relative group">
                      <div className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                        isTrigger 
                          ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300' 
                          : step.type === 'email'
                          ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md'
                          : 'bg-white border-green-200 hover:border-green-400 hover:shadow-md'
                      }`}>
                        {/* Step Icon */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                          isTrigger 
                            ? 'bg-purple-600' 
                            : step.type === 'email'
                            ? 'bg-blue-600'
                            : 'bg-green-600'
                        } text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        {/* Step Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {isTrigger ? 'Journey Starts' : step.label || (step.type === 'email' ? 'Email' : 'SMS')}
                            </span>
                            {!isTrigger && (
                              <span className="text-xs text-gray-500">Step {index}</span>
                            )}
                          </div>
                          {!isTrigger && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {step.type === 'email' ? 'Sends email message' : 'Sends SMS message'}
                            </p>
                          )}
                        </div>
                        
                        {/* Step Controls - Only show for non-trigger steps */}
                        {!isTrigger && (
                          <button
                            onClick={() => removeStep(step.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"
                            title="Remove step"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>

                      {/* Connector Line */}
                      {index < flowSteps.length - 1 && !isTrigger && (
                        <div className="flex items-center justify-center py-1">
                          <div className="h-6 w-0.5 bg-gray-300"></div>
                        </div>
                      )}
                      {index < flowSteps.length - 1 && isTrigger && (
                        <div className="flex items-center justify-center py-2">
                          <ArrowRight className="w-5 h-5 text-purple-400" />
                        </div>
                      )}
                    </div>
                  </Fragment>
                );
              })}

              {/* Drop Zone After Last Step */}
              {isDragging && (
                <div
                  onDragOver={(e) => handleDropZoneDragOver(e, flowSteps.length)}
                  onDragLeave={handleDropZoneDragLeave}
                  onDrop={(e) => handleDropZoneDrop(e, flowSteps.length)}
                  className={`h-2 rounded transition-all duration-200 ${
                    dragOverIndex === flowSteps.length 
                      ? 'bg-blue-400 border-2 border-blue-500' 
                      : 'bg-transparent'
                  }`}
                />
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default FlowBuilder;
