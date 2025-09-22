import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useSequenceDesigner = (sequenceId = null) => {
  const [sequence, setSequence] = useState(null);
  const [steps, setSteps] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch sequence data
  const fetchSequence = useCallback(async () => {
    if (!sequenceId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSequence(result.sequence);
        setSteps(result.sequence.sequence_steps || []);
      } else {
        throw new Error(result.error || 'Failed to fetch sequence');
      }
    } catch (err) {
      console.error('Error fetching sequence:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/message-templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setTemplates(result.templates);
      } else {
        throw new Error(result.error || 'Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    }
  }, []);

  // Create new sequence
  const createSequence = useCallback(async (sequenceData) => {
    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/sequences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sequenceData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSequence(result.sequence);
        toast.success('Sequence created successfully');
        return result.sequence;
      } else {
        throw new Error(result.error || 'Failed to create sequence');
      }
    } catch (err) {
      console.error('Error creating sequence:', err);
      setError(err.message);
      toast.error(`Failed to create sequence: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update sequence
  const updateSequence = useCallback(async (updateData) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSequence(result.sequence);
        toast.success('Sequence updated successfully');
        return result.sequence;
      } else {
        throw new Error(result.error || 'Failed to update sequence');
      }
    } catch (err) {
      console.error('Error updating sequence:', err);
      setError(err.message);
      toast.error(`Failed to update sequence: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Create step
  const createStep = useCallback(async (stepData) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/steps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stepData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSteps(prev => [...prev, result.step].sort((a, b) => a.step_index - b.step_index));
        toast.success('Step added successfully');
        return result.step;
      } else {
        throw new Error(result.error || 'Failed to create step');
      }
    } catch (err) {
      console.error('Error creating step:', err);
      setError(err.message);
      toast.error(`Failed to add step: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Create sequence with steps (for recipes)
  const createSequenceWithSteps = useCallback(async (sequenceData, stepsData = []) => {
    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      // Create the sequence first
      const sequenceResponse = await fetch('/api/sequences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sequenceData)
      });

      if (!sequenceResponse.ok) {
        throw new Error(`HTTP error! status: ${sequenceResponse.status}`);
      }

      const sequenceResult = await sequenceResponse.json();
      if (!sequenceResult.ok) {
        throw new Error(sequenceResult.error || 'Failed to create sequence');
      }

      const newSequence = sequenceResult.sequence;

      // Create steps for the sequence
      const createdSteps = [];
      for (const stepData of stepsData) {
        const stepResponse = await fetch(`/api/sequences/${newSequence.id}/steps`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(stepData)
        });

        if (stepResponse.ok) {
          const stepResult = await stepResponse.json();
          if (stepResult.ok) {
            createdSteps.push(stepResult.step);
          }
        }
      }

      toast.success('Sequence created successfully');
      return { ...newSequence, sequence_steps: createdSteps };
    } catch (err) {
      console.error('Error creating sequence with steps:', err);
      setError(err.message);
      toast.error(`Failed to create sequence: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update step
  const updateStep = useCallback(async (stepId, updateData) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSteps(prev => prev.map(step => 
          step.id === stepId ? result.step : step
        ).sort((a, b) => a.step_index - b.step_index));
        toast.success('Step updated successfully');
        return result.step;
      } else {
        throw new Error(result.error || 'Failed to update step');
      }
    } catch (err) {
      console.error('Error updating step:', err);
      setError(err.message);
      toast.error(`Failed to update step: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Delete step
  const deleteStep = useCallback(async (stepId) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/steps/${stepId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSteps(prev => prev.filter(step => step.id !== stepId));
        toast.success('Step deleted successfully');
      } else {
        throw new Error(result.error || 'Failed to delete step');
      }
    } catch (err) {
      console.error('Error deleting step:', err);
      setError(err.message);
      toast.error(`Failed to delete step: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Reorder steps
  const reorderSteps = useCallback(async (newSteps) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/steps/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ steps: newSteps })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        setSteps(newSteps.sort((a, b) => a.step_index - b.step_index));
        toast.success('Steps reordered successfully');
      } else {
        throw new Error(result.error || 'Failed to reorder steps');
      }
    } catch (err) {
      console.error('Error reordering steps:', err);
      setError(err.message);
      toast.error(`Failed to reorder steps: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Test send message
  const testSendMessage = useCallback(async (testData) => {
    if (!sequenceId) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/sequences/${sequenceId}/test-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.ok) {
        toast.success('Test message sent successfully');
        return result.test_message;
      } else {
        throw new Error(result.error || 'Failed to send test message');
      }
    } catch (err) {
      console.error('Error sending test message:', err);
      setError(err.message);
      toast.error(`Failed to send test message: ${err.message}`);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [sequenceId]);

  // Validate sequence before activation
  const validateSequence = useCallback(() => {
    const errors = [];

    if (!sequence?.name) {
      errors.push('Sequence name is required');
    }

    if (!sequence?.trigger_event_type) {
      errors.push('Trigger event type is required');
    }

    if (steps.length === 0) {
      errors.push('At least one step is required');
    }

    // Check if all send steps have templates
    const sendSteps = steps.filter(step => step.kind === 'send_email' || step.kind === 'send_sms');
    for (const step of sendSteps) {
      if (!step.template_id) {
        errors.push(`Step ${step.step_index + 1} (${step.kind}) requires a template`);
      }
    }

    // Check if all wait steps have wait times
    const waitSteps = steps.filter(step => step.kind === 'wait');
    for (const step of waitSteps) {
      if (!step.wait_ms || step.wait_ms <= 0) {
        errors.push(`Step ${step.step_index + 1} (wait) requires a valid wait time`);
      }
    }

    return errors;
  }, [sequence, steps]);

  useEffect(() => {
    if (sequenceId) {
      fetchSequence();
    }
    fetchTemplates();
  }, [sequenceId, fetchSequence, fetchTemplates]);

  return {
    sequence,
    steps,
    templates,
    loading,
    saving,
    error,
    createSequence,
    createSequenceWithSteps,
    updateSequence,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    testSendMessage,
    validateSequence,
    refetch: fetchSequence
  };
};
