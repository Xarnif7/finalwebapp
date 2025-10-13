import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Zap, 
  Trash2, 
  ArrowRight
} from 'lucide-react';

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
    setFlowSteps(prev => prev.filter(step => step.id !== stepId && step.type !== 'trigger'));
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
      {/* Draggable Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Drag items to build your flow:</h4>
          {isDragging && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              ✨ Drop between steps to insert, or at the end to append
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {draggableItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-move hover:opacity-80 transition-all duration-200 ${item.color} text-white text-sm font-medium shadow-sm hover:shadow-md`}
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
            <div className="flex items-center justify-center flex-wrap gap-4">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                
                return (
                  <React.Fragment key={step.id}>
                    {/* Drop Zone Before Step */}
                    <div
                      onDragOver={(e) => handleDropZoneDragOver(e, index)}
                      onDragLeave={handleDropZoneDragLeave}
                      onDrop={(e) => handleDropZoneDrop(e, index)}
                      className={`h-16 w-8 rounded-lg border-2 border-dashed transition-all duration-200 ${
                        dragOverIndex === index 
                          ? 'border-blue-400 bg-blue-100' 
                          : 'border-transparent hover:border-gray-300'
                      } ${isDragging ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {dragOverIndex === index && (
                        <div className="flex items-center justify-center h-full">
                          <div className="w-1 h-8 bg-blue-400 rounded-full"></div>
                        </div>
                      )}
                    </div>

                    {/* Step */}
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] text-gray-500 mb-1">Step {index + 1}</div>
                      <div className="relative group">
                        <div
                          onClick={() => handleStepClick(index)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer hover:opacity-80 transition-all duration-200 ${step.color} text-white text-sm font-medium min-w-[100px] justify-center shadow-sm hover:shadow-md`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{step.label}</span>
                        </div>
                        
                        {/* Step Controls - Only show for non-trigger steps */}
                        {step.type !== 'trigger' && (
                          <div className="absolute -top-12 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
                              {index > 1 && (
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                                  onClick={() => moveStep(step.id, 'up')}
                                  title="Move up"
                                >
                                  <span className="text-xs font-bold text-gray-600">↑</span>
                                </button>
                              )}
                              {index < flowSteps.length - 1 && (
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                                  onClick={() => moveStep(step.id, 'down')}
                                  title="Move down"
                                >
                                  <span className="text-xs font-bold text-gray-600">↓</span>
                                </button>
                              )}
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                onClick={() => removeStep(step.id)}
                                title="Delete step"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connecting Arrow - Show between steps */}
                    {index < flowSteps.length - 1 && (
                      <div className="flex items-center">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Drop Zone After Last Step */}
              <div
                onDragOver={(e) => handleDropZoneDragOver(e, flowSteps.length)}
                onDragLeave={handleDropZoneDragLeave}
                onDrop={(e) => handleDropZoneDrop(e, flowSteps.length)}
                className={`h-16 w-8 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  dragOverIndex === flowSteps.length 
                    ? 'border-blue-400 bg-blue-100' 
                    : 'border-transparent hover:border-gray-300'
                } ${isDragging ? 'opacity-100' : 'opacity-0'}`}
              >
                {dragOverIndex === flowSteps.length && (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-1 h-8 bg-blue-400 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default FlowBuilder;
