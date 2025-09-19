import React, { useState } from 'react';
import { X, Save, Play, Plus, Trash2, Settings, Mail, MessageSquare, Clock, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SequenceDesigner = ({ 
  sequence, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [activePanel, setActivePanel] = useState('settings');
  const [sequenceData, setSequenceData] = useState({
    name: sequence?.name || '',
    trigger: sequence?.trigger || 'zapier',
    triggerEvent: sequence?.triggerEvent || 'job_completed',
    allowManualEnroll: sequence?.allowManualEnroll || false,
    exitConditions: {
      reviewLeft: true,
      unsubscribed: true,
      archived: true
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'EST'
    },
    rateLimits: {
      maxPerHour: 10,
      maxPerDay: 50
    },
    steps: sequence?.steps || []
  });

  const [draggedStep, setDraggedStep] = useState(null);

  const panels = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'canvas', label: 'Canvas', icon: Play },
    { id: 'step', label: 'Step Config', icon: Mail }
  ];

  const stepTypes = [
    { id: 'email', label: 'Send Email', icon: Mail, color: 'bg-blue-100 text-blue-800' },
    { id: 'sms', label: 'Send SMS', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
    { id: 'wait', label: 'Wait', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'branch', label: 'Branch', icon: Users, color: 'bg-purple-100 text-purple-800' }
  ];

  const addStep = (stepType) => {
    const newStep = {
      id: Date.now(),
      type: stepType,
      name: stepTypes.find(s => s.id === stepType)?.label || 'New Step',
      config: {}
    };
    setSequenceData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (stepId) => {
    setSequenceData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const updateStep = (stepId, updates) => {
    setSequenceData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  const renderSettings = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <Label htmlFor="sequence-name">Sequence Name</Label>
        <Input
          id="sequence-name"
          value={sequenceData.name}
          onChange={(e) => setSequenceData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Job Completion Follow-up"
          className="mt-1"
        />
      </div>

      {/* Enrollment */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Enrollment</h3>
        <div className="space-y-4">
          <div>
            <Label>Trigger</Label>
            <select 
              value={sequenceData.trigger}
              onChange={(e) => setSequenceData(prev => ({ ...prev, trigger: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="zapier">Zapier Event</option>
              <option value="webhook">Webhook</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>

          {sequenceData.trigger === 'zapier' && (
            <div>
              <Label>Zapier Event</Label>
              <select 
                value={sequenceData.triggerEvent}
                onChange={(e) => setSequenceData(prev => ({ ...prev, triggerEvent: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="job_completed">Job Completed</option>
                <option value="service_scheduled">Service Scheduled</option>
                <option value="payment_received">Payment Received</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={sequenceData.allowManualEnroll}
              onCheckedChange={(checked) => setSequenceData(prev => ({ ...prev, allowManualEnroll: checked }))}
            />
            <Label>Allow manual enrollment</Label>
          </div>
        </div>
      </div>

      {/* Exit Conditions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Exit Conditions</h3>
        <div className="space-y-3">
          {Object.entries(sequenceData.exitConditions).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Switch
                checked={value}
                onCheckedChange={(checked) => setSequenceData(prev => ({
                  ...prev,
                  exitConditions: { ...prev.exitConditions, [key]: checked }
                }))}
              />
              <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quiet Hours</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={sequenceData.quietHours.enabled}
              onCheckedChange={(checked) => setSequenceData(prev => ({
                ...prev,
                quietHours: { ...prev.quietHours, enabled: checked }
              }))}
            />
            <Label>Enable quiet hours</Label>
          </div>

          {sequenceData.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={sequenceData.quietHours.start}
                  onChange={(e) => setSequenceData(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, start: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={sequenceData.quietHours.end}
                  onChange={(e) => setSequenceData(prev => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, end: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate Limits */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Rate Limits</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max per hour</Label>
            <Input
              type="number"
              value={sequenceData.rateLimits.maxPerHour}
              onChange={(e) => setSequenceData(prev => ({
                ...prev,
                rateLimits: { ...prev.rateLimits, maxPerHour: parseInt(e.target.value) }
              }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Max per day</Label>
            <Input
              type="number"
              value={sequenceData.rateLimits.maxPerDay}
              onChange={(e) => setSequenceData(prev => ({
                ...prev,
                rateLimits: { ...prev.rateLimits, maxPerDay: parseInt(e.target.value) }
              }))}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCanvas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Sequence Steps</h3>
        <div className="flex space-x-2">
          {stepTypes.map(stepType => {
            const Icon = stepType.icon;
            return (
              <Button
                key={stepType.id}
                variant="outline"
                size="sm"
                onClick={() => addStep(stepType.id)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{stepType.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {sequenceData.steps.map((step, index) => {
          const stepType = stepTypes.find(s => s.id === step.type);
          const Icon = stepType?.icon || Settings;
          return (
            <Card key={step.id} className="relative group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${stepType?.color || 'bg-gray-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{step.name}</div>
                      <div className="text-sm text-slate-500">
                        {step.type === 'wait' ? 'Wait 5 hours' : 'Configure step settings'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivePanel('step')}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(step.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sequenceData.steps.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
          <Play className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Add steps to build your sequence</p>
        </div>
      )}
    </div>
  );

  const renderStepConfig = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Step Configuration</h3>
      
      <div className="text-center py-12 text-slate-500">
        <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p>Select a step from the canvas to configure it</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activePanel) {
      case 'settings':
        return renderSettings();
      case 'canvas':
        return renderCanvas();
      case 'step':
        return renderStepConfig();
      default:
        return renderSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Designer */}
      <div className="absolute inset-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {sequence ? 'Edit Sequence' : 'Create New Sequence'}
            </h2>
            <p className="text-sm text-slate-500">Design your review request automation</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button 
              size="sm"
              onClick={() => onSave(sequenceData)}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activePanel === panel.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{panel.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex h-full">
          {/* Left Panel - Settings */}
          <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto">
            {renderSettings()}
          </div>

          {/* Middle Panel - Canvas */}
          <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto">
            {renderCanvas()}
          </div>

          {/* Right Panel - Step Config */}
          <div className="w-1/3 p-6 overflow-y-auto">
            {renderStepConfig()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceDesigner;
