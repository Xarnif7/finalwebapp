import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare, ArrowRight, Plus, Trash2, GripVertical, Zap, List } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";
import ActiveSequences from "@/components/automation/ActiveSequences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AutomatedRequestsPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState("Subject: Thank you for your business!\n\nHi {{customer.name}},\n\nWe hope you had a great experience with us. If you have a moment, we would appreciate it if you could leave us a review at the link below.\n\n{{review_link}}\n\nThank you!");
  const [showEmailSaved, setShowEmailSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customizationData, setCustomizationData] = useState({
    name: '',
    description: '',
    steps: []
  });
  const [activeTab, setActiveTab] = useState('templates');

  // Load templates on component mount
  useEffect(() => {
    if (business?.id) {
      loadTemplates();
    }
  }, [business?.id]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailTemplate = async () => {
    try {
      setShowEmailSaved(true);
      setTimeout(() => setShowEmailSaved(false), 2000);
      
      // Save to templates table
      const response = await fetch(`/api/templates/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          name: 'Email Template',
          description: emailTemplate,
          channels: ['email'],
          trigger_type: 'event',
          config_json: {
            message: emailTemplate,
            delay_hours: 24
          }
        })
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error saving email template:', error);
    }
  };

  const handleTemplateToggle = async (templateId, newStatus) => {
    setUpdating(prev => ({ ...prev, [templateId]: true }));
    
    try {
      const response = await fetch(`/api/templates/${business.id}/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [templateId]: false }));
    }
  };

  const handleCustomize = (template) => {
    setSelectedTemplate(template);
    setCustomizationData({
      name: template.name,
      description: template.description,
      steps: template.config_json?.steps || []
    });
    setCustomizeModalOpen(true);
  };

  const handleTest = async (template) => {
    try {
      const response = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          template_id: template.id,
          customer_id: null // Will use first available customer
        })
      });

      if (response.ok) {
        alert('Test automation triggered successfully!');
      } else {
        alert('Failed to trigger test automation');
      }
    } catch (error) {
      console.error('Error testing automation:', error);
      alert('Error testing automation');
    }
  };

  const handleDelete = async (template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        const response = await fetch(`/api/templates/${business.id}/${template.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.access_token}`
          }
        });

        if (response.ok) {
          await loadTemplates();
        }
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleCreateSequence = () => {
    setCreateModalOpen(true);
  };

  const handleSequenceCreated = () => {
    setCreateModalOpen(false);
    loadTemplates();
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Automated Requests"
        subtitle="Create and manage automation sequences with beautiful visual flow cards and full customization."
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Sequences
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Create Custom Sequence Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Email Templates</h2>
            <Button onClick={handleCreateSequence} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Sequence
            </Button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <FlowCard
                key={template.id}
                template={template}
                onToggle={(status) => handleTemplateToggle(template.id, status)}
                onCustomize={() => handleCustomize(template)}
                onTest={() => handleTest(template)}
                onDelete={() => handleDelete(template)}
                updating={updating[template.id]}
              />
            ))}
          </div>

          {/* Manual Email Template Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Manual Email Template
              </CardTitle>
              <CardDescription>
                Create and send manual review request emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-template">Email Template</Label>
                <Textarea
                  id="email-template"
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  className="mt-1"
                  rows={8}
                  placeholder="Enter your email template here..."
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Use <code className="bg-gray-100 px-1 rounded">{'{{customer.name}}'}</code> and <code className="bg-gray-100 px-1 rounded">{'{{review_link}}'}</code> for personalization
                </div>
                <div className="flex space-x-2">
                  {showEmailSaved && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Saved!
                    </Badge>
                  )}
                  <Button onClick={saveEmailTemplate} variant="outline">
                    Save Template
                  </Button>
                  <Button onClick={saveEmailTemplate} className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'active' && (
        <ActiveSequences businessId={business?.id} />
      )}

      {/* Customize Modal */}
      <Dialog open={customizeModalOpen} onOpenChange={setCustomizeModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={customizationData.name}
                onChange={(e) => setCustomizationData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={customizationData.description}
                onChange={(e) => setCustomizationData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            {/* Add more customization options here */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Save customization logic here
              setCustomizeModalOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sequence Modal */}
      <SequenceCreator
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSequenceCreated={handleSequenceCreated}
        businessId={business?.id}
      />
    </div>
  );
};

export default AutomatedRequestsPage;
