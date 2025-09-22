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
import { Switch } from "@/components/ui/switch";
import { Send, CheckCircle, Clock, Play, Pause, Settings, Mail, MessageSquare } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";

const AutomatedRequestsPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState("Subject: Thank you for your business!\n\nHi {{customer.name}},\n\nWe hope you had a great experience with us. If you have a moment, we would appreciate it if you could leave us a review at the link below.\n\n{{review_link}}\n\nThank you!");
  const [showEmailSaved, setShowEmailSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

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
      console.error('Error saving template:', error);
    }
  };

  const toggleTemplateStatus = async (template) => {
    try {
      setUpdating(prev => ({ ...prev, [template.id]: true }));
      
      const newStatus = template.status === 'active' ? 'paused' : 'active';
      
      const response = await fetch(`/api/templates/${business.id}/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadTemplates();
      } else {
        alert('Error updating template status');
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Error updating template status');
    } finally {
      setUpdating(prev => ({ ...prev, [template.id]: false }));
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

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader
          title="Automated Requests"
          subtitle="Manage templates and send manual requests to customers."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading automation templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Automated Requests"
        subtitle="Manage automation templates and trigger sequences for your customers."
      />

      {/* Premade Automation Templates */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Automation Templates
          </CardTitle>
          <CardDescription>
            Pre-built automation sequences that trigger based on customer events. Toggle them on/off and test them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No automation templates yet</h3>
              <p className="text-slate-500 mb-4">Create your first automation template to get started.</p>
              <Button onClick={() => window.location.href = '/sequences'}>
                Create Automation Template
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Switch 
                      checked={template.status === 'active'} 
                      onCheckedChange={() => toggleTemplateStatus(template)}
                      disabled={updating[template.id]}
                    />
                  </div>
                  
                  <p className="text-sm text-slate-600">
                    {template.config_json?.message || 'No message configured'}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {template.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel === 'sms' ? <MessageSquare className="w-3 h-3 mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                        {channel === 'sms' ? 'SMS' : 'Email'}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-xs">
                      {template.trigger_type}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => triggerTestAutomation(template)}
                      className="flex-1"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => window.location.href = '/sequences'}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Email Template */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
          <CardDescription>
            Used for sending manual review requests via email. This template is used when you manually send requests to customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            rows={6}
            placeholder="Enter your email template..."
          />
          <div className="flex justify-end mt-4">
            <Button onClick={saveEmailTemplate} disabled={showEmailSaved}>
              {showEmailSaved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : "Save Email Template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automation Status */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Automation Status</CardTitle>
          <CardDescription>
            Overview of your automation system and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
              <div className="text-sm text-slate-600">Total Templates</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter(t => t.status === 'active').length}
              </div>
              <div className="text-sm text-slate-600">Active Automations</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {templates.filter(t => t.channels.includes('email')).length}
              </div>
              <div className="text-sm text-slate-600">Email Channels</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedRequestsPage;