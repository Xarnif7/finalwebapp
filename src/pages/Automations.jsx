import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Play, 
  Pause, 
  Copy, 
  Archive, 
  Trash2, 
  Edit,
  Mail,
  MessageSquare,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  Zap,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import SequenceDetailsDrawer from '../components/automations/SequenceDetailsDrawer';
import SequenceDesigner from '../components/automations/SequenceDesigner';

export default function AutomationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sequences');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showSequenceDesigner, setShowSequenceDesigner] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);

  // Mock data
  const sequences = [
    {
      id: 1,
      name: 'Job Completion Follow-up',
      channel: 'email',
      enrollmentRule: 'Zapier: Job Completed',
      steps: ['Send Email', 'Wait 5h', 'Send SMS'],
      status: 'active',
      customersInFlow: 12,
      conversionRate: 23.5,
      lastSent: '2h ago'
    },
    {
      id: 2,
      name: 'Service Reminder',
      channel: 'sms',
      enrollmentRule: 'Manual + Zapier: Service Scheduled',
      steps: ['Send SMS', 'Wait 1d', 'Send Email'],
      status: 'paused',
      customersInFlow: 8,
      conversionRate: 18.2,
      lastSent: '1d ago'
    }
  ];

  const kpiData = {
    activeSequences: 3,
    customersInSequences: 20,
    requestsSent7d: 156,
    conversionRate: 21.3
  };

  const tabs = [
    { id: 'sequences', label: 'Sequences', icon: Play },
    { id: 'triggers', label: 'Triggers', icon: Zap },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'logs', label: 'Logs', icon: BarChart3 }
  ];

  // Handler functions
  const handleEditSequence = (sequence) => {
    setEditingSequence(sequence);
    setShowSequenceDesigner(true);
  };

  const handlePauseSequence = (sequenceId) => {
    console.log('Pause sequence:', sequenceId);
    // Implementation for pausing sequence
  };

  const handleResumeSequence = (sequenceId) => {
    console.log('Resume sequence:', sequenceId);
    // Implementation for resuming sequence
  };

  const handleDuplicateSequence = (sequenceId) => {
    console.log('Duplicate sequence:', sequenceId);
    // Implementation for duplicating sequence
  };

  const handleArchiveSequence = (sequenceId) => {
    console.log('Archive sequence:', sequenceId);
    // Implementation for archiving sequence
  };

  const handleDeleteSequence = (sequenceId) => {
    console.log('Delete sequence:', sequenceId);
    // Implementation for deleting sequence
  };

  const handleSaveSequence = (sequenceData) => {
    console.log('Save sequence:', sequenceData);
    // Implementation for saving sequence
    setShowSequenceDesigner(false);
    setEditingSequence(null);
  };

  const getChannelIcon = (channel) => {
    return channel === 'email' ? Mail : MessageSquare;
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={variants[status] || variants.draft}>
        {status}
      </Badge>
    );
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
        <p className="text-slate-600 mt-2">Create and manage your review request sequences</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Integration Pill */}
        <div className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Connected to Zapier</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-green-700">
              <Clock className="h-4 w-4" />
              <span>Last sync 2h ago</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-green-700 hover:text-green-800 hover:bg-green-100 h-8 px-3"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Zaps
            </Button>
          </div>
        </div>

        <Button
          onClick={() => setShowSequenceDesigner(true)}
          className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>
    </div>
  );

  const renderKPI = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
      <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-600">Active Sequences</h3>
          <Play className="h-4 w-4 text-slate-400" />
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{kpiData.activeSequences}</div>
        <p className="text-sm text-slate-500">Currently running</p>
      </div>

      <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-600">Customers in Sequences</h3>
          <Users className="h-4 w-4 text-slate-400" />
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{kpiData.customersInSequences}</div>
        <p className="text-sm text-slate-500">Active now</p>
      </div>

      <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-600">Conversion Rate</h3>
          <TrendingUp className="h-4 w-4 text-slate-400" />
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1">{kpiData.conversionRate}%</div>
        <p className="text-sm text-slate-500">Last 7 days</p>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="border-b border-slate-200 mb-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderSequencesList = () => (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search sequences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select className="px-3 py-2 border border-input rounded-md bg-background">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Active</Button>
            <Button variant="outline" size="sm">Paused</Button>
            <Button variant="outline" size="sm">Drafts</Button>
          </div>
        </div>
      </div>

      {/* Sequences Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Sequence</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Enrollment Rule</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Steps</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((sequence) => {
                  const ChannelIcon = getChannelIcon(sequence.channel);
                  return (
                    <tr 
                      key={sequence.id} 
                      className="border-b hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedSequence(sequence);
                        setShowDetailsDrawer(true);
                      }}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <ChannelIcon className="h-5 w-5 text-slate-400" />
                          <div>
                            <div className="font-semibold text-slate-900">{sequence.name}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {sequence.channel.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {sequence.enrollmentRule}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1 text-sm text-slate-600">
                          {sequence.steps.map((step, index) => (
                            <React.Fragment key={index}>
                              <span>{step}</span>
                              {index < sequence.steps.length - 1 && (
                                <span className="text-slate-400">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(sequence.status)}
                          <span className="text-sm text-slate-600">
                            {sequence.customersInFlow} customers
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <div className="font-medium text-slate-900">{sequence.conversionRate}%</div>
                          <div className="text-slate-500">Last sent {sequence.lastSent}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="relative dropdown-container">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle dropdown
                            }}
                            className="p-1"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Play className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No sequences yet</h3>
      <p className="text-slate-600 mb-6">Create your first review request sequence to get started</p>
      <Button
        onClick={() => setShowSequenceDesigner(true)}
        className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Sequence
      </Button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sequences':
        return sequences.length > 0 ? renderSequencesList() : renderEmptyState();
      case 'triggers':
        return <div className="text-center py-12 text-slate-500">Triggers section coming soon</div>;
      case 'templates':
        return <div className="text-center py-12 text-slate-500">Templates section coming soon</div>;
      case 'logs':
        return <div className="text-center py-12 text-slate-500">Logs section coming soon</div>;
      default:
        return renderSequencesList();
    }
  };

  return (
    <div className="px-6 py-6">
      {renderHeader()}
      {renderKPI()}
      {renderTabs()}
      {renderTabContent()}

      {/* Sequence Details Drawer */}
      <SequenceDetailsDrawer
        sequence={selectedSequence}
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        onEdit={handleEditSequence}
        onPause={handlePauseSequence}
        onResume={handleResumeSequence}
        onDuplicate={handleDuplicateSequence}
        onArchive={handleArchiveSequence}
        onDelete={handleDeleteSequence}
      />

      {/* Sequence Designer */}
      <SequenceDesigner
        sequence={editingSequence}
        isOpen={showSequenceDesigner}
        onClose={() => {
          setShowSequenceDesigner(false);
          setEditingSequence(null);
        }}
        onSave={handleSaveSequence}
      />
    </div>
  );
}
