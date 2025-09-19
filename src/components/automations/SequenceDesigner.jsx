import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Play, 
  Settings, 
  Plus, 
  Trash2, 
  GripVertical,
  Mail,
  MessageSquare,
  Clock,
  Eye,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useSequenceDesigner } from '../../hooks/useSequenceDesigner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SequenceDesigner = ({ sequenceId, onClose, onSave }) => {
  const {
    sequence,
    steps,
    templates,
    loading,
    saving,
    error,
    createSequence,
    updateSequence,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    testSendMessage,
    validateSequence
  } = useSequenceDesigner(sequenceId);

  const [activePanel, setActivePanel] = useState('settings');
  const [selectedStep, setSelectedStep] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testData, setTestData] = useState({ email: '', phone: '' });

  // Form state for sequence settings
  const [formData, setFormData] = useState({
    name: '',
    trigger_event_type: '',
    allow_manual_enroll: false,
    quiet_hours_start: '',
    quiet_hours_end: '',
    rate_per_hour: '',
    rate_per_day: ''
  });

  // Update form data when sequence loads
  useEffect(() => {
    if (sequence) {
      setFormData({
        name: sequence.name || '',
        trigger_event_type: sequence.trigger_event_type || '',
        allow_manual_enroll: sequence.allow_manual_enroll || false,
        quiet_hours_start: sequence.quiet_hours_start || '',
        quiet_hours_end: sequence.quiet_hours_end || '',
        rate_per_hour: sequence.rate_per_hour || '',
        rate_per_day: sequence.rate_per_day || ''
      });
    }
  }, [sequence]);

  const handleSave = async () => {
    try {
      if (sequenceId) {
        await updateSequence(formData);
      } else {
        const newSequence = await createSequence(formData);
        if (onSave) {
          onSave(newSequence);
        }
      }
    } catch (error) {
      console.error('Error saving sequence:', error);
    }
  };

  const handleActivate = async () => {
    const errors = validateSequence();
    if (errors.length > 0) {
      toast.error(`Cannot activate sequence: ${errors.join(', ')}`);
      return;
    }

    try {
      await updateSequence({ ...formData, status: 'active' });
      toast.success('Sequence activated successfully');
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error activating sequence:', error);
    }
  };

  const handleAddStep = async (kind) => {
    try {
      const stepIndex = steps.length;
      await createStep({
        kind,
        step_index: stepIndex,
        wait_ms: kind === 'wait' ? 3600000 : null, // Default 1 hour for wait steps
        template_id: null
      });
    } catch (error) {
      console.error('Error adding step:', error);
    }
  };

  const handleUpdateStep = async (stepId, updateData) => {
    try {
      await updateStep(stepId, updateData);
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const handleDeleteStep = async (stepId) => {
    try {
      await deleteStep(stepId);
      if (selectedStep?.id === stepId) {
        setSelectedStep(null);
      }
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  const handleReorderSteps = async (newSteps) => {
    try {
      await reorderSteps(newSteps);
    } catch (error) {
      console.error('Error reordering steps:', error);
    }
  };

  const handleTestSend = async () => {
    if (!selectedStep || !testData.email && !testData.phone) {
      toast.error('Please provide email or phone for test');
      return;
    }

    try {
      await testSendMessage({
        ...testData,
        template_id: selectedStep.template_id,
        step_index: selectedStep.step_index
      });
      setShowTestModal(false);
    } catch (error) {
      console.error('Error sending test:', error);
    }
  };

  const getStepIcon = (kind) => {
    switch (kind) {
      case 'send_email':
        return <Mail className="w-4 h-4" />;
      case 'send_sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'wait':
        return <Clock className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getStepName = (kind) => {
    switch (kind) {
      case 'send_email':
        return 'Send Email';
      case 'send_sms':
        return 'Send SMS';
      case 'wait':
        return 'Wait';
      default:
        return 'Unknown';
    }
  };

  const formatWaitTime = (waitMs) => {
    if (!waitMs) return '0m';
    const minutes = Math.round(waitMs / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getTemplateName = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    return template ? template.name : 'No template selected';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold">
            {sequenceId ? 'Edit Sequence' : 'Create Sequence'}
          </h2>
          <p className="text-sm text-gray-600">
            Design your review request automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleActivate}
            disabled={saving || !sequence}
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Activate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Settings */}
        <div className="w-80 border-r bg-gray-50 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Sequence Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Job Completion Follow-up"
                  />
                </div>

                <div>
                  <Label htmlFor="trigger">Trigger Event</Label>
                  <Select
                    value={formData.trigger_event_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_event_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job_completed">Job Completed</SelectItem>
                      <SelectItem value="service_delivered">Service Delivered</SelectItem>
                      <SelectItem value="invoice_paid">Invoice Paid</SelectItem>
                      <SelectItem value="manual">Manual Trigger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="manual_enroll"
                    checked={formData.allow_manual_enroll}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manual_enroll: checked }))}
                  />
                  <Label htmlFor="manual_enroll">Allow Manual Enrollment</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet_start">Quiet Hours Start</Label>
                    <Input
                      id="quiet_start"
                      type="time"
                      value={formData.quiet_hours_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet_end">Quiet Hours End</Label>
                    <Input
                      id="quiet_end"
                      type="time"
                      value={formData.quiet_hours_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate_hour">Rate Limit (Hour)</Label>
                    <Input
                      id="rate_hour"
                      type="number"
                      value={formData.rate_per_hour}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_per_hour: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rate_day">Rate Limit (Day)</Label>
                    <Input
                      id="rate_day"
                      type="number"
                      value={formData.rate_per_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_per_day: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel - Canvas */}
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sequence Steps</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('send_email')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Add Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('send_sms')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add SMS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('wait')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Add Wait
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No steps added yet. Add your first step to get started.</p>
                </div>
              ) : (
                steps.map((step, index) => (
                  <Card
                    key={step.id}
                    className={`cursor-pointer transition-colors ${
                      selectedStep?.id === step.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStep(step)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {getStepIcon(step.kind)}
                          </div>
                          <div>
                            <div className="font-medium">{getStepName(step.kind)}</div>
                            <div className="text-sm text-gray-600">
                              {step.kind === 'wait' 
                                ? `Wait ${formatWaitTime(step.wait_ms)}`
                                : getTemplateName(step.template_id)
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Step {index + 1}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(step.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Step Config */}
        <div className="w-80 border-l bg-gray-50 p-6">
          {selectedStep ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Step Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Step Type</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStepIcon(selectedStep.kind)}
                      <span className="font-medium">{getStepName(selectedStep.kind)}</span>
                    </div>
                  </div>

                  {selectedStep.kind === 'wait' && (
                    <div>
                      <Label htmlFor="wait_time">Wait Time (minutes)</Label>
                      <Input
                        id="wait_time"
                        type="number"
                        value={selectedStep.wait_ms ? Math.round(selectedStep.wait_ms / 1000 / 60) : ''}
                        onChange={(e) => {
                          const minutes = parseInt(e.target.value) || 0;
                          handleUpdateStep(selectedStep.id, { wait_ms: minutes * 60 * 1000 });
                        }}
                        placeholder="60"
                      />
                    </div>
                  )}

                  {(selectedStep.kind === 'send_email' || selectedStep.kind === 'send_sms') && (
                    <div>
                      <Label htmlFor="template">Message Template</Label>
                      <Select
                        value={selectedStep.template_id || ''}
                        onValueChange={(value) => handleUpdateStep(selectedStep.id, { template_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates
                            .filter(t => t.channel === selectedStep.kind.replace('send_', ''))
                            .map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(selectedStep.kind === 'send_email' || selectedStep.kind === 'send_sms') && selectedStep.template_id && (
                    <div>
                      <Label>Template Preview</Label>
                      <div className="mt-1 p-3 bg-white border rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">
                          {templates.find(t => t.id === selectedStep.template_id)?.subject}
                        </div>
                        <div className="text-sm">
                          {templates.find(t => t.id === selectedStep.template_id)?.content}
                        </div>
                      </div>
                    </div>
                  )}

                  {(selectedStep.kind === 'send_email' || selectedStep.kind === 'send_sms') && selectedStep.template_id && (
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTestModal(true)}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Test Send
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-8 h-8 mx-auto mb-2" />
              <p>Select a step to configure it</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Send Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Test Send Message</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test_email">Email</Label>
                <Input
                  id="test_email"
                  type="email"
                  value={testData.email}
                  onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <Label htmlFor="test_phone">Phone</Label>
                <Input
                  id="test_phone"
                  type="tel"
                  value={testData.phone}
                  onChange={(e) => setTestData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTestModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTestSend}
                disabled={!testData.email && !testData.phone}
              >
                Send Test
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceDesigner;