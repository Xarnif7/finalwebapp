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
  BarChart3,
  Settings,
  Eye,
  Send
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { useSequencesData } from '../hooks/useSequencesData';
import { useZapierStatus } from '../hooks/useZapierStatus';
import SequenceDetailsDrawer from '../components/automations/SequenceDetailsDrawer';
import SequenceDesigner from '../components/automations/SequenceDesigner';
import SequencesList from '../components/automations/SequencesList';
import RecipeCards from '../components/automations/RecipeCards';
import TriggersTab from '../components/automations/TriggersTab';
import TemplatesTab from '../components/automations/TemplatesTab';
import LogsTab from '../components/automations/LogsTab';
import AutomationKPIs from '../components/automations/AutomationKPIs';
import AlertBanner from '../components/automations/AlertBanner';
import OnboardingChecklist from '../components/automations/OnboardingChecklist';
import { useAutomationMetrics } from '../hooks/useAutomationMetrics';

export default function AutomationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sequences');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showSequenceDesigner, setShowSequenceDesigner] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    channel: 'all',
    manualEnroll: 'all'
  });
  const [savedView, setSavedView] = useState('all');

  // Use real data from API
  const { sequences, loading, error } = useSequencesData();
  const { isConnected: isZapierConnected } = useZapierStatus();
  const { metrics, loading: metricsLoading } = useAutomationMetrics();
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Calculate KPI data from real sequences
  const kpiData = {
    activeSequences: sequences.filter(s => s.status === 'active').length,
    customersInSequences: sequences.reduce((sum, s) => sum + s.active_enrollments, 0),
    requestsSent7d: 156, // TODO: Calculate from real data
    conversionRate: 21.3 // TODO: Calculate from real data
  };

  const tabs = [
    { id: 'sequences', label: 'Sequences', icon: Play },
    { id: 'triggers', label: 'Triggers', icon: Zap },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'logs', label: 'Logs', icon: BarChart3 }
  ];

  const savedViews = [
    { id: 'all', label: 'All Sequences' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'drafts', label: 'Drafts' }
  ];

  // Handler functions
  const handleCreateSequence = () => {
    setEditingSequence(null);
    setShowSequenceDesigner(true);
  };

  const handleEditSequence = (sequence) => {
    setEditingSequence(sequence);
    setShowSequenceDesigner(true);
  };

  const handleCloseDesigner = () => {
    setShowSequenceDesigner(false);
    setEditingSequence(null);
  };

  const handleSaveSequence = (sequence) => {
    // Refresh sequences list
    // The useSequencesData hook will automatically refetch
    setShowSequenceDesigner(false);
    setEditingSequence(null);
  };

  const handleRecipeSequenceCreated = (sequence) => {
    // Refresh sequences list when a recipe creates a new sequence
    // The useSequencesData hook will automatically refetch
    console.log('Recipe created sequence:', sequence);
  };

  const handleKpiClick = (filterType, filterValue) => {
    console.log('KPI clicked:', filterType, filterValue);
    
    // Apply filter to sequences list
    if (filterType === 'status' && filterValue === 'active') {
      // Filter to show only active sequences
      setSearchQuery('status:active');
    } else if (filterType === 'enrollment' && filterValue === 'active') {
      // Filter to show sequences with active enrollments
      setSearchQuery('enrollment:active');
    } else if (filterType === 'conversion' && filterValue === '7d') {
      // Filter to show sequences with recent activity
      setSearchQuery('conversion:7d');
    }
    
    // Switch to sequences tab to show filtered results
    setActiveTab('sequences');
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



  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const handleSavedViewChange = (viewId) => {
    setSavedView(viewId);
    switch (viewId) {
      case 'active':
        setFilters(prev => ({ ...prev, status: 'active' }));
        break;
      case 'paused':
        setFilters(prev => ({ ...prev, status: 'paused' }));
        break;
      case 'drafts':
        setFilters(prev => ({ ...prev, status: 'draft' }));
        break;
      default:
        setFilters(prev => ({ ...prev, status: 'all' }));
    }
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

  const getChannelBadge = (channel) => {
    const variants = {
      email: 'bg-blue-100 text-blue-800',
      sms: 'bg-green-100 text-green-800'
    };
    return (
      <Badge className={variants[channel] || variants.email}>
        {channel.toUpperCase()}
      </Badge>
    );
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
        <p className="text-slate-600 mt-2">Create and manage review-request sequences</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Zapier Connection Pill */}
        <div className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">✓ Connected</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-green-700 hover:text-green-800 hover:bg-green-100 h-7 px-2 text-xs"
            >
              View Zaps
            </Button>
            
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <Clock className="h-3 w-3" />
              <span>Last sync 2h ago</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowOnboarding(true)}
          className="text-blue-600 hover:text-blue-700"
        >
          Setup Guide
        </Button>
        <Button
          onClick={handleCreateSequence}
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
      {/* KPI Cards */}
      <AutomationKPIs onKpiClick={handleKpiClick} />

      {/* Recipe Cards */}
      <RecipeCards 
        isZapierConnected={isZapierConnected}
        onRecipeSequenceCreated={handleRecipeSequenceCreated}
      />

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

      {/* Sequences List Component */}
      <SequencesList onEdit={handleEditSequence} />
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
        return renderSequencesList();
      case 'triggers':
        return <TriggersTab />;
      case 'templates':
        return <TemplatesTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return renderSequencesList();
    }
  };

  const handleDismissAlert = () => {
    setDismissedAlerts(prev => new Set([...prev, 'failure-rate']));
  };

  return (
    <div className="px-6 py-6">
      {renderHeader()}
      {renderKPI()}
      
      {/* Alert Banner */}
      {metrics.hasAlert && !dismissedAlerts.has('failure-rate') && (
        <AlertBanner 
          metrics={metrics} 
          onDismiss={handleDismissAlert}
        />
      )}
      
      {/* Quick Start Recipe Cards */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Quick Start Recipes</h2>
          <p className="text-slate-600">Get started with pre-built automation sequences</p>
        </div>
        <RecipeCards 
          isZapierConnected={isZapierConnected}
          onSequenceCreated={handleRecipeSequenceCreated}
        />
      </div>
      
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
      {showSequenceDesigner && (
        <div className="fixed inset-0 z-50 bg-white">
          <SequenceDesigner
            sequenceId={editingSequence?.id || null}
            onClose={handleCloseDesigner}
            onSave={handleSaveSequence}
          />
        </div>
      )}

      {/* Onboarding Checklist Modal */}
      <OnboardingChecklist
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
