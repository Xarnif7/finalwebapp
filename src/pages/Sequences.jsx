import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Repeat, CheckCircle, Clock, ArrowRight, MessageSquare, Mail, Edit, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";

export default function SequencesPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [sequences, setSequences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState({});

  // Load sequences and templates
  useEffect(() => {
    if (business?.id) {
      loadData();
    }
  }, [business?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load automation templates (these act as our "sequences")
      const response = await fetch('/api/templates/' + business.id);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setSequences(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSequence = async (sequenceData) => {
    try {
      setCreating(true);
      
      const response = await fetch('/api/templates/' + business.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(sequenceData)
      });

      if (response.ok) {
        await loadData();
        setIsModalOpen(false);
      } else {
        const error = await response.json();
        alert('Error creating sequence: ' + error.error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Error creating sequence');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (sequence) => {
    try {
      setUpdating(prev => ({ ...prev, [sequence.id]: true }));
      
      const newStatus = sequence.status === 'active' ? 'paused' : 'active';
      
      const response = await fetch(`/api/templates/${business.id}/${sequence.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadData();
      } else {
        alert('Error updating sequence');
      }
    } catch (error) {
      console.error('Error toggling sequence:', error);
      alert('Error updating sequence');
    } finally {
      setUpdating(prev => ({ ...prev, [sequence.id]: false }));
    }
  };

  const handleDeleteSequence = async (id) => {
    if (window.confirm("Are you sure you want to delete this sequence? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/templates/${business.id}/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });

        if (response.ok) {
          await loadData();
        } else {
          alert('Error deleting sequence');
        }
      } catch (error) {
        console.error('Error deleting sequence:', error);
        alert('Error deleting sequence');
      }
    }
  };

  const triggerTestAutomation = async (template) => {
    try {
      // Find a customer to test with
      const customersResponse = await fetch(`/api/customers/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        const customers = customersData.customers || [];
        
        if (customers.length === 0) {
          alert('No customers found. Please add a customer first to test automation.');
          return;
        }

        // Use the first customer for testing
        const testCustomer = customers[0];
        
        const response = await fetch('/api/automation/trigger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.access_token}`
          },
          body: JSON.stringify({
            customer_id: testCustomer.id,
            trigger_type: template.key || 'job_completed',
            trigger_data: {
              test: true,
              template_id: template.id
            }
          })
        });

        if (response.ok) {
          alert(`Test automation triggered for ${testCustomer.full_name}! Check your automation executions.`);
        } else {
          const error = await response.json();
          alert('Error triggering test: ' + error.error);
        }
      }
    } catch (error) {
      console.error('Error triggering test automation:', error);
      alert('Error triggering test automation');
    }
  };

  const openCustomizeModal = (template) => {
    // For now, redirect to the main automation page for customization
    // In a full implementation, you'd open a modal here
    window.location.href = '/automations';
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader 
          title="Automation Sequences"
          subtitle="Create and manage multi-step follow-up campaigns with visual flow control."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading sequences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Automation Sequences"
        subtitle="Create and manage multi-step follow-up campaigns with visual flow control."
      />

      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Repeat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No sequences yet</h3>
            <p className="text-slate-500 mb-6">Create your first automation sequence to start engaging customers automatically.</p>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Create Your First Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {sequences.map((sequence, i) => (
            <motion.div
              key={sequence.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <FlowCard
                sequence={sequence}
                onToggle={handleToggleActive}
                onCustomize={openCustomizeModal}
                onTest={triggerTestAutomation}
                onDelete={handleDeleteSequence}
                updating={updating[sequence.id]}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Sequence Creator Modal */}
      <SequenceCreator
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateSequence}
        business={business}
      />
    </div>
  );
}