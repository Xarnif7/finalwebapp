import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Repeat, CheckCircle, Clock, ArrowRight, MessageSquare, Mail, Edit, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";

export default function SequencesPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [sequences, setSequences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'event',
    channels: ['email'],
    steps: []
  });

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

  const handleCreateSequence = async () => {
    try {
      setCreating(true);
      
      const response = await fetch('/api/templates/' + business.id, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          channels: formData.channels,
          trigger_type: formData.trigger_type,
          config_json: {
            message: formData.description,
            delay_hours: 24
          }
        })
      });

      if (response.ok) {
        await loadData();
        setIsModalOpen(false);
        setFormData({
          name: '',
          description: '',
          trigger_type: 'event',
          channels: ['email'],
          steps: []
        });
      } else {
        const error = await response.json();
        alert('Error creating sequence: ' + error.error);
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

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { channel: 'email', delay_days: 1, template: '' }]
    }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader 
          title="Automation Sequences"
          subtitle="Create and manage multi-step follow-up campaigns."
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
        subtitle="Create and manage multi-step follow-up campaigns."
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
              <Card className="rounded-2xl h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{sequence.name}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{sequence.description || 'Automated follow-up sequence'}</p>
                    </div>
                    <Switch 
                      checked={sequence.status === 'active'} 
                      onCheckedChange={() => handleToggleActive(sequence)} 
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {sequence.channels.map((channel, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <ArrowRight className="w-4 h-4 text-slate-400" />}
                        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                          {channel === 'sms' ? <MessageSquare className="w-3 h-3"/> : <Mail className="w-3 h-3"/>}
                          <span>{channel === 'sms' ? 'SMS' : 'Email'} {sequence.trigger_type === 'event' ? 'on trigger' : 'scheduled'}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      {sequence.config_json?.message || 'Default automation message'}
                    </p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-4 flex justify-between items-center border-t border-slate-100">
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={sequence.status === 'active' ? 'default' : 'secondary'}>
                        {sequence.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">{sequence.trigger_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-600" 
                      onClick={() => handleDeleteSequence(sequence.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Sequence</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Sequence Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., New Customer Welcome"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this sequence does..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <Select 
                value={formData.trigger_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event-based (job completed, payment received)</SelectItem>
                  <SelectItem value="date_based">Date-based (scheduled reminders)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Channels</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes('email')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, channels: [...prev.channels, 'email'] }));
                      } else {
                        setFormData(prev => ({ ...prev, channels: prev.channels.filter(c => c !== 'email') }));
                      }
                    }}
                  />
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes('sms')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, channels: [...prev.channels, 'sms'] }));
                      } else {
                        setFormData(prev => ({ ...prev, channels: prev.channels.filter(c => c !== 'sms') }));
                      }
                    }}
                  />
                  <MessageSquare className="w-4 h-4" />
                  SMS (Coming Soon)
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSequence} disabled={creating || !formData.name}>
              {creating ? 'Creating...' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}