import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare, ArrowRight, Plus, Trash2, Zap, List, BarChart3, Activity, FileText, Eye, TrendingUp, Users, AlertTriangle, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import FlowCard from "@/components/automation/FlowCard";
import SequenceCreator from "@/components/automation/SequenceCreator";
import ActiveSequences from "@/components/automation/ActiveSequences";
import TemplateCustomizer from "@/components/automation/TemplateCustomizer";

const AutomationsPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [activeSequences, setActiveSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [kpis, setKpis] = useState({
    activeSequences: 0,
    totalRecipients: 0,
    sendSuccessRate: 0,
    failureRate: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    roi: 0
  });

  // Initialize with mock templates
  useEffect(() => {
    console.log('Automations component mounted');
    console.log('User:', user);
    console.log('Business:', business);
    
    // Set mock templates
    setTemplates([
      {
        id: 'mock-1',
        name: 'Job Completed',
        key: 'job_completed',
        status: 'paused',
        channels: ['email'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
          delay_hours: 24
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        name: 'Invoice Paid',
        key: 'invoice_paid',
        status: 'paused',
        channels: ['email'],
        trigger_type: 'event',
        config_json: {
          message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
          delay_hours: 48
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-3',
        name: 'Service Reminder',
        key: 'service_reminder',
        status: 'paused',
        channels: ['email'],
        trigger_type: 'date_based',
        config_json: {
          message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          delay_days: 1
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);
    
    setLoading(false);
  }, [user, business]);

  // Update active sequences when templates change
  useEffect(() => {
    const activeTemplates = templates.filter(t => t.status === 'active');
    setActiveSequences(activeTemplates.map(template => ({
      id: template.id,
      name: template.name,
      description: getTemplateDescription(template),
      channels: template.channels || ['email'],
      status: template.status,
      trigger_type: template.trigger_type,
      config_json: template.config_json,
      created_at: template.created_at,
      updated_at: template.updated_at
    })));
  }, [templates]);

  const getTemplateDescription = (template) => {
    const descriptions = {
      'job_completed': 'Sends thank you email 24 hours after job completion',
      'invoice_paid': 'Sends review request 48 hours after invoice payment',
      'service_reminder': 'Sends reminder 1 day before scheduled service',
      'mock-1': 'Sends thank you email 24 hours after job completion',
      'mock-2': 'Sends review request 48 hours after invoice payment', 
      'mock-3': 'Sends reminder 1 day before scheduled service'
    };
    
    return descriptions[template.key] || descriptions[template.id] || `Custom automation for ${template.name}`;
  };

  const handleTemplateToggle = async (templateId, newStatus) => {
    setUpdating(prev => ({ ...prev, [templateId]: true }));
    
    try {
      // Update local state immediately
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, status: newStatus } : t
      ));
      
      console.log(`Template ${templateId} ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating template:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [templateId]: false }));
    }
  };

  const handleCustomize = (template) => {
    setSelectedTemplate(template);
    setCustomizeModalOpen(true);
  };

  const handleTemplateSaved = async (newTemplate) => {
    console.log('Template saved:', newTemplate);
    if (newTemplate) {
      setTemplates(prev => [...prev, newTemplate]);
    }
    setCustomizeModalOpen(false);
  };

  const handleSequenceCreated = async (newTemplate) => {
    console.log('Sequence created:', newTemplate);
    if (newTemplate) {
      setTemplates(prev => [...prev, newTemplate]);
    }
    setCreateModalOpen(false);
  };

  const handleTest = async (template) => {
    try {
      const testEmail = user?.email || 'test@example.com';
      const testName = user?.user_metadata?.full_name || 'Test Customer';

      console.log('=== EMAIL TEST ===');
      console.log('To:', testEmail);
      console.log('Template:', template.name);
      console.log('Message:', template.config_json?.message);
      console.log('==================');

      alert(`Test email would be sent to ${testEmail}! Check console for details.`);
    } catch (error) {
      console.error('Error testing automation:', error);
      alert('Error testing automation');
    }
  };

  const handleCreateSequence = () => {
    setCreateModalOpen(true);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader
          title="Automations"
          subtitle="Create and manage automation sequences with beautiful visual flow cards and full customization."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Automations"
        subtitle="Create and manage automation sequences with beautiful visual flow cards and full customization."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Active Sequences
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Automation Templates</h3>
              <p className="text-sm text-gray-600">Create and manage your automation sequences.</p>
            </div>
            <Button onClick={handleCreateSequence} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <FlowCard
                key={template.id}
                template={template}
                onToggle={(status) => handleTemplateToggle(template.id, status)}
                onCustomize={() => handleCustomize(template)}
                onTest={() => handleTest(template)}
                updating={updating[template.id]}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Active Sequences</h3>
              <p className="text-sm text-gray-600">Currently running automation sequences</p>
            </div>
          </div>

          {activeSequences.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSequences.map((sequence) => (
                <Card key={sequence.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {sequence.name}
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </CardTitle>
                    <CardDescription>{sequence.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      {sequence.channels?.map((channel, index) => (
                        <div key={index} className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-md">
                          {channel === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          <span className="text-xs font-medium text-blue-700">{channel}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleTest(sequence)}>
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTemplateToggle(sequence.id, 'paused')}>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No active sequences</h3>
                <p className="text-gray-500 mb-4">Activate a template to see it here.</p>
                <Button onClick={() => setActiveTab('templates')}>
                  View Templates
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Overview</h3>
            <p className="text-sm text-gray-600">Automation performance and insights</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Sequences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSequences.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Activity</h3>
            <p className="text-sm text-gray-600">Recent automation activity</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent activity</p>
                <p className="text-sm">Automation activity will appear here once sequences are running.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Customizer Modal */}
      <TemplateCustomizer
        isOpen={customizeModalOpen}
        onClose={() => setCustomizeModalOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateSaved}
        businessId={business?.id}
      />

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

export default AutomationsPage;
