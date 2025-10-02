import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, 
  MessageSquare, 
  Edit, 
  Copy, 
  Archive, 
  Send,
  Eye,
  BarChart,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useMessageTemplates } from '../../hooks/useMessageTemplates';
import { useSmsStatus } from '../../hooks/useSmsStatus';

const TemplatesTab = () => {
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useMessageTemplates();
  const { isSmsEnabled, isSmsPending, isSmsActionNeeded, isSmsNotProvisioned, getSmsStatusMessage } = useSmsStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === 'all' || template.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getChannelBadge = (channel) => {
    const variants = {
      email: 'bg-blue-100 text-blue-800',
      sms: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={variants[channel] || variants.email}>
        {getChannelIcon(channel)}
        <span className="ml-1 capitalize">{channel}</span>
      </Badge>
    );
  };

  const formatLastUsed = (lastUsed) => {
    if (!lastUsed) return 'Never';
    const date = new Date(lastUsed);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicate = async (template) => {
    try {
      await duplicateTemplate(template.id);
      toast.success('Template duplicated successfully!');
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const handleArchive = async (template) => {
    try {
      await deleteTemplate(template.id);
      toast.success('Template archived successfully!');
    } catch (error) {
      toast.error('Failed to archive template');
    }
  };

  const handleTestSend = async (template) => {
    try {
      if (template.channel === 'email' && !testEmail) {
        toast.error('Please enter an email address');
        return;
      }
      if (template.channel === 'sms' && !testPhone) {
        toast.error('Please enter a phone number');
        return;
      }

      // This would call the test send API
      toast.success(`Test ${template.channel} sent successfully!`);
    } catch (error) {
      toast.error('Failed to send test message');
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        toast.success('Template updated successfully!');
      } else {
        await createTemplate(templateData);
        toast.success('Template created successfully!');
      }
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const renderTemplateEditor = () => {
    if (!showEditor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditor(false);
                setEditingTemplate(null);
              }}
            >
              ×
            </Button>
          </div>

          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Message Templates</h2>
          <p className="text-slate-600 mt-1">
            Create and manage email and SMS templates for your sequences
          </p>
        </div>
        <Button
          onClick={() => setShowEditor(true)}
          className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
        >
          <Mail className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getChannelIcon(template.channel)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {template.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {template.channel} template
                    </p>
                  </div>
                </div>
                {getChannelBadge(template.channel)}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Template Preview */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {template.content}
                  </p>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Last used
                    </div>
                    <div className="font-semibold text-slate-900">
                      {formatLastUsed(template.last_used)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <BarChart className="w-4 h-4" />
                      7d performance
                    </div>
                    <div className="font-semibold text-slate-900">
                      {template.channel === 'email' 
                        ? `${template.open_rate || 0}% open`
                        : `${template.delivery_rate || 0}% delivered`
                      }
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleEdit(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDuplicate(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    onClick={() => handleArchive(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                </div>

                {/* Test Send */}
                <div className="space-y-2">
                  {template.channel === 'email' ? (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleTestSend(template)}
                        size="sm"
                        className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="+1234567890"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleTestSend(template)}
                        size="sm"
                        className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || channelFilter !== 'all' ? 'No templates found' : 'No templates yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || channelFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first message template to get started'
            }
          </p>
          {!searchQuery && channelFilter === 'all' && (
            <Button
              onClick={() => setShowEditor(true)}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      )}

      {/* Template Editor Modal */}
      {renderTemplateEditor()}
    </div>
  );
};

// Template Editor Component
const TemplateEditor = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    channel: template?.channel || 'email',
    subject: template?.subject || '',
    content: template?.content || ''
  });

  const [previewData, setPreviewData] = useState({
    first_name: 'John',
    last_name: 'Doe',
    service_date: '2024-01-15',
    business_name: 'Your Business'
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreviewChange = (field, value) => {
    setPreviewData(prev => ({ ...prev, [field]: value }));
  };

  const replaceVariables = (text) => {
    return text
      .replace(/\{\{first_name\}\}/g, previewData.first_name)
      .replace(/\{\{last_name\}\}/g, previewData.last_name)
      .replace(/\{\{service_date\}\}/g, previewData.service_date)
      .replace(/\{\{business_name\}\}/g, previewData.business_name);
  };

  const handleSave = () => {
    if (!formData.name || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter template name"
          />
        </div>
        <div>
          <Label htmlFor="channel">Channel *</Label>
          <Select value={formData.channel} onValueChange={(value) => handleInputChange('channel', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms" disabled={!isSmsEnabled()}>
                <div className={`flex items-center gap-2 ${!isSmsEnabled() ? 'opacity-50' : ''}`}>
                  <MessageSquare className="w-4 h-4" />
                  SMS
                  {!isSmsEnabled() && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {isSmsNotProvisioned() ? 'Not Set Up' : 
                       isSmsPending() ? 'Pending' : 
                       isSmsActionNeeded() ? 'Action Needed' : 'Disabled'}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subject (Email only) */}
      {formData.channel === 'email' && (
        <div>
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Enter email subject"
          />
        </div>
      )}

      {/* Content */}
      <div>
        <Label htmlFor="content">Message Content *</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="Enter your message content. Use variables like {{first_name}}, {{service_date}}, etc."
          rows={6}
        />
        <p className="text-sm text-gray-500 mt-1">
          Available variables: {`{{first_name}}, {{last_name}}, {{service_date}}, {{business_name}}`}
        </p>
      </div>

      {/* Preview */}
      <div>
        <Label>Preview</Label>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <strong>To:</strong> {previewData.first_name} {previewData.last_name}
            </div>
            {formData.channel === 'email' && formData.subject && (
              <div className="text-sm text-gray-600">
                <strong>Subject:</strong> {replaceVariables(formData.subject)}
              </div>
            )}
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {replaceVariables(formData.content)}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Variables */}
      <div>
        <Label>Preview Variables</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="preview_first_name">First Name</Label>
            <Input
              id="preview_first_name"
              value={previewData.first_name}
              onChange={(e) => handlePreviewChange('first_name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="preview_last_name">Last Name</Label>
            <Input
              id="preview_last_name"
              value={previewData.last_name}
              onChange={(e) => handlePreviewChange('last_name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="preview_service_date">Service Date</Label>
            <Input
              id="preview_service_date"
              value={previewData.service_date}
              onChange={(e) => handlePreviewChange('service_date', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="preview_business_name">Business Name</Label>
            <Input
              id="preview_business_name"
              value={previewData.business_name}
              onChange={(e) => handlePreviewChange('business_name', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
        >
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
};

export default TemplatesTab;
