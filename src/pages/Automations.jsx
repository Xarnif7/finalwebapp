import React, { useState, useEffect } from 'react';
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
  Send,
  HelpCircle,
  Activity,
  ArrowRight,
  ArrowDown,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { useSequencesData } from '../hooks/useSequencesData';
import { useZapierStatus } from '../hooks/useZapierStatus';
import { useAutomationKPIs } from '../hooks/useAutomationKPIs';
import { useTemplates } from '../hooks/useTemplates';
import { useActiveSequences } from '../hooks/useActiveSequences';
import { useCustomers } from '../hooks/useCustomers';
import { useBusinessIntegrations } from '../hooks/useBusinessIntegrations';
import { useHealth } from '../hooks/useHealth';
import SequenceDetailsDrawer from '../components/automations/SequenceDetailsDrawer';
import SequenceDesigner from '../components/automations/SequenceDesigner';
import SequencesList from '../components/automations/SequencesList';
import RecipeCards from '../components/automations/RecipeCards';
import TriggersTab from '../components/automations/TriggersTab';
import TemplatesTab from '../components/automations/TemplatesTab';
import LogsTab from '../components/automations/LogsTab';
import AutomationKPIs from '../components/automations/AutomationKPIs';
import OnboardingChecklist from '../components/automations/OnboardingChecklist';
import SetupGuideDrawer from '../components/automations/SetupGuideDrawer';
import MyActiveSequences from '../components/automations/MyActiveSequences';
import ActivityFeed from '../components/automations/ActivityFeed';
import AutomationWizard from '../components/automations/AutomationWizard';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import { ToastProvider } from '../components/ui/toast';
import { Skeleton } from '../components/ui/skeleton';

export default function AutomationsPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('templates'); // New main tab switcher
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { toasts, toastSuccess, toastError, removeToast } = useToast();

  // Use real data from API - always call hooks consistently
  const { sequences, loading, error } = useSequencesData();
  const { isConnected: isZapierConnected, loading: zapierLoading } = useZapierStatus();
  const { kpis, loading: kpisLoading, error: kpisError } = useAutomationKPIs(user?.business_id);
  const { 
    templates, 
    loading: templatesLoading, 
    error: templatesError, 
    updateTemplateStatus, 
    provisionDefaultTemplates 
  } = useTemplates();
  const { 
    sequences: activeSequences, 
    loading: activeSequencesLoading, 
    error: activeSequencesError, 
    updateSequenceStatus: updateActiveSequenceStatus 
  } = useActiveSequences();
  const { hasCustomers } = useCustomers(user?.business_id);
  const { hasActiveIntegration } = useBusinessIntegrations();
  const { health, loading: healthLoading } = useHealth();

  // Auto-provision templates if customers exist but no templates
  useEffect(() => {
    const autoProvisionTemplates = async () => {
      if (hasCustomers && templates && templates.length === 0 && !templatesLoading) {
        console.log('[TEMPLATES] Auto-provisioning templates for business with customers');
        try {
          await provisionDefaultTemplates();
          // Templates will be refetched automatically by the hook
        } catch (error) {
          console.error('[TEMPLATES] Error auto-provisioning templates:', error);
        }
      }
    };

    autoProvisionTemplates();
  }, [hasCustomers, templates, templatesLoading, provisionDefaultTemplates]);

  const mainTabs = [
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'sequences', label: 'Active Sequences', icon: Play },
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

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

  const handleKpiClick = (kpiType) => {
    switch (kpiType) {
      case 'activeSequences':
        // Scroll to MyActiveSequences section
        const activeSequencesSection = document.getElementById('my-active-sequences');
        if (activeSequencesSection) {
          activeSequencesSection.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'customersInSequences':
        // Switch to Manage tab and filter to show sequences with active enrollments
        setMainTab('manage');
        setActiveTab('sequences');
        setFilters(prev => ({ ...prev, status: 'active' }));
        break;
      case 'conversionRate':
        // Switch to Manage tab and show logs with 7-day filter
        setMainTab('manage');
        setActiveTab('logs');
        // Set date filter to last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setFilters(prev => ({ 
          ...prev, 
          dateFrom: sevenDaysAgo.toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        }));
        break;
      default:
        break;
    }
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


  const handleViewSequence = (sequenceId) => {
    console.log('View sequence:', sequenceId);
    // Implementation for viewing sequence
    const sequence = sequences.find(s => s.id === sequenceId);
    if (sequence) {
      setSelectedSequence(sequence);
      setShowDetailsDrawer(true);
    }
  };

  const handleViewCustomer = (customerId) => {
    console.log('View customer:', customerId);
    // Implementation for viewing customer - could navigate to customers tab
    // For now, just show a message
  };

  const handleSetupGuideConnect = () => {
    // Close the drawer and open Zapier connection
    setShowSetupGuide(false);
    handleConnectZapier();
  };

  const handleSetupGuideCreateSequence = () => {
    // Close the drawer and open sequence creation
    setShowSetupGuide(false);
    handleCreateSequence();
  };

  const handleSetupGuideViewLogs = () => {
    // Close the drawer and switch to logs tab
    setShowSetupGuide(false);
    setMainTab('manage');
    setActiveTab('logs');
  };

  const handleOpenWizard = () => {
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
  };

  const handleSequenceCreated = (sequence) => {
    // Sequence is already added to the list via the hook
    toastSuccess(`Sequence "${sequence.name}" created successfully!`);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showWizard) {
          setShowWizard(false);
        } else if (showSetupGuide) {
          setShowSetupGuide(false);
        } else if (showOnboarding) {
          setShowOnboarding(false);
        } else if (showDetailsDrawer) {
          setShowDetailsDrawer(false);
        } else if (showSequenceDesigner) {
          setShowSequenceDesigner(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showWizard, showSetupGuide, showOnboarding, showDetailsDrawer, showSequenceDesigner]);



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
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
        <p className="text-slate-600">Create and manage review-request sequences</p>
      </div>
      
          <div className="flex gap-2">
            <Button
              onClick={() => setShowWizard(true)}
              variant="outline"
              className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Sequence
            </Button>
            <Button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Quick setup automation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Quick Setup
            </Button>
          </div>
    </div>
  );


  const renderMainTabs = () => (
    <div className="border-b border-slate-200 mb-8">
      <nav className="flex space-x-8" role="tablist" aria-label="Main navigation">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md ${
                isActive
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
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
        
        <div className="flex space-x-2">
          <Button
            onClick={handleOpenWizard}
            variant="outline"
            className="flex items-center space-x-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom</span>
          </Button>
          <Button
            onClick={handleCreateSequence}
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sequence
          </Button>
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

  const renderMainContent = () => {
    switch (mainTab) {
      case 'overview':
        return renderOverviewTab();
      case 'sequences':
        return renderSequencesTab();
      case 'templates':
        return renderTemplatesTab();
      case 'activity':
        return renderActivityTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => {
    if (kpisLoading) {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (kpisError) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error loading KPIs</h3>
          <p className="text-slate-600 mb-6">{kpisError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* High-Level KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Sequences Count */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Sequences</p>
                <p className="text-2xl font-bold text-slate-900">{kpis.activeSequences}</p>
              </div>
            </div>
          </div>

          {/* Send Success Rate */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Send Success Rate</p>
                <p className="text-2xl font-bold text-slate-900">
                  {kpis.hasData ? `${kpis.sendSuccessRate}%` : 'No data yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Total Recipients */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Recipients</p>
                <p className="text-2xl font-bold text-slate-900">{kpis.totalRecipients}</p>
              </div>
            </div>
          </div>

          {/* Failure Rate */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Failure Rate</p>
                <p className="text-2xl font-bold text-slate-900">
                  {kpis.hasData ? `${kpis.failureRate}%` : 'No data yet'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats (only show if there's data) */}
        {kpis.hasData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Sends (7d)</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis.totalSends}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Successful Sends</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis.successfulSends}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Failed Sends</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis.failedSends}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Health Card */}
        {health && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                health.status === 'healthy' 
                  ? 'bg-green-100 text-green-800' 
                  : health.status === 'warning'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {health.status}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Pending Jobs</p>
                <p className="font-semibold text-slate-900">{health.pending_jobs_due || 0}</p>
              </div>
              <div>
                <p className="text-slate-600">Queue Depth</p>
                <p className="font-semibold text-slate-900">{health.queue_depth || 0}</p>
              </div>
              <div>
                <p className="text-slate-600">Last Worker Run</p>
                <p className="font-semibold text-slate-900">
                  {health.last_worker_run_at 
                    ? new Date(health.last_worker_run_at).toLocaleTimeString()
                    : 'Never'
                  }
                </p>
              </div>
              <div>
                <p className="text-slate-600">Last Webhook</p>
                <p className="font-semibold text-slate-900">
                  {health.last_webhook_at 
                    ? new Date(health.last_webhook_at).toLocaleTimeString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            
            {health.warnings && health.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Warning</p>
                    <p className="text-sm text-yellow-700">{health.warnings[0]}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Setup CTA */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to automate your reviews?</h2>
          <p className="text-slate-600 mb-6">
            Set up automated review requests in under 2 minutes. Choose from our pre-built templates or create your own custom sequences.
          </p>
          <Button
            onClick={() => setShowWizard(true)}
            size="lg"
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Quick Setup
          </Button>
        </div>
      </div>
    );
  };

  const renderSequencesTab = () => {
    // Handle sequence status updates
    const handleSequenceAction = async (sequence) => {
      try {
        if (sequence.status === 'active') {
          // Pause sequence
          await updateActiveSequenceStatus(sequence.id, 'paused');
          toastSuccess(`${sequence.name} sequence paused successfully!`);
        } else if (sequence.status === 'paused') {
          // Resume sequence
          await updateActiveSequenceStatus(sequence.id, 'active');
          toastSuccess(`${sequence.name} sequence resumed successfully!`);
        }
      } catch (error) {
        console.error('Error updating sequence status:', error);
        toastError('Failed to update sequence status');
      }
    };

    // Handle customizing sequence
    const handleCustomizeSequence = (sequence) => {
      // TODO: Open sequence customization modal/drawer
      console.log('Customizing sequence:', sequence);
      toastSuccess(`Opening ${sequence.name} customization...`);
    };

    if (activeSequencesLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeSequencesError) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error loading sequences</h3>
          <p className="text-slate-600 mb-6">{activeSequencesError}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with Create Sequence button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Active Sequences</h2>
            <p className="text-sm text-slate-600">Manage your automation sequences</p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Sequence
          </Button>
        </div>

        {/* Sequences content */}
        {activeSequences.length === 0 ? (
          <div className="text-center py-12">
            <Play className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No sequences yet — enable a template</h3>
            <p className="text-slate-600 mb-6">Enable templates from the Templates tab to create active sequences</p>
            <Button
              onClick={() => setMainTab('templates')}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Go to Templates
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Sequence Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Trigger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Channels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Next Run
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {activeSequences.map((sequence) => (
                    <tr key={sequence.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{sequence.name}</div>
                          <div className="text-sm text-slate-500">{sequence.key}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {sequence.trigger_type === 'event' ? 'Event-based' : 'Date-based'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {sequence.channels?.join(', ') || 'SMS, Email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {sequence.trigger_type === 'date_based' 
                          ? 'Next service date' 
                          : 'On event trigger'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCustomizeSequence(sequence)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Customize
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSequenceAction(sequence)}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTemplatesTab = () => {
    // Determine template status based on CRM integration and database state
    const getTemplateStatus = (template) => {
      // If CRM is connected (either has customers OR has active integration), show as ready
      if (hasActiveIntegration || hasCustomers) {
        return template.status; // 'ready', 'active', 'paused'
      }
      return 'connect_required';
    };
    
    // Handle template status updates
    const handleTemplateAction = async (template) => {
      try {
        if (template.status === 'ready') {
          // Enable template
          await updateTemplateStatus(template.id, 'active');
          toastSuccess(`${template.name} template enabled successfully!`);
        } else if (template.status === 'active') {
          // Pause template
          await updateTemplateStatus(template.id, 'paused');
          toastSuccess(`${template.name} template paused successfully!`);
        } else if (template.status === 'paused') {
          // Resume template
          await updateTemplateStatus(template.id, 'active');
          toastSuccess(`${template.name} template resumed successfully!`);
        }
        
        // Templates will be refetched automatically by the hook after status update
      } catch (error) {
        console.error('Error updating template status:', error);
        toastError('Failed to update template status');
      }
    };

    // Handle customizing template
    const handleCustomizeTemplate = (template) => {
      // TODO: Open template customization modal/drawer
      console.log('Customizing template:', template);
      toastSuccess(`Opening ${template.name} customization...`);
    };

    // If no templates exist but customers exist, provision defaults
    const handleProvisionDefaults = async () => {
      try {
        await provisionDefaultTemplates();
        toastSuccess('Default templates created successfully!');
      } catch (error) {
        console.error('Error provisioning default templates:', error);
        toastError('Failed to create default templates');
      }
    };

    if (templatesLoading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (templatesError) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error loading templates</h3>
          <p className="text-slate-600 mb-6">{templatesError}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    // If no templates exist and not loading
    if (!templatesLoading && (!templates || templates.length === 0)) {
      return (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates found</h3>
          <p className="text-slate-600 mb-6">
            {hasActiveIntegration || hasCustomers
              ? "Default templates are being created automatically. If this persists, try refreshing the page."
              : "Connect your CRM first, then we'll create default templates for you."
            }
          </p>
          {hasActiveIntegration || hasCustomers ? (
            <div className="space-y-2">
              <Button onClick={handleProvisionDefaults} className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Default Templates
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          ) : (
            <Button onClick={() => window.location.href = '/customers'} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Connect Your CRM
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const templateStatus = getTemplateStatus(template);
            const isConnectRequired = templateStatus === 'connect_required';
            const isReady = templateStatus === 'ready';
            const isActive = templateStatus === 'active';
            const isPaused = templateStatus === 'paused';
            
            return (
              <div key={template.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{template.name}</h3>
                  <Badge className={
                    isConnectRequired ? "bg-red-100 text-red-800" :
                    isReady ? "bg-orange-100 text-orange-800" :
                    isActive ? "bg-green-100 text-green-800" :
                    "bg-yellow-100 text-yellow-800"
                  }>
                    {isConnectRequired ? "Connect Required" : 
                     isReady ? "Connected & Ready" : 
                     isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                
                <p className="text-sm text-slate-600 mb-4">
                  {template.key === 'job_completed' && "Send review requests when jobs are marked complete. Perfect for contractors and service providers."}
                  {template.key === 'invoice_paid' && "Request reviews after payment is received. Great for B2B services and recurring clients."}
                  {template.key === 'service_reminder' && "Follow up with customers after service appointments. Ideal for maintenance and recurring services."}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-slate-500">
                    Triggers: {template.trigger_type === 'event' ? 'Event-based' : 'Date-based'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Channels: {template.channels?.join(', ') || 'SMS, Email'}
                  </div>
                </div>

                <div className="space-y-2">
                  {isConnectRequired && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => window.location.href = '/customers'}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Connect Your CRM
                    </Button>
                  )}
                  
                  {isReady && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleTemplateAction(template)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Enable Template
                    </Button>
                  )}
                  
                  {isActive && (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleTemplateAction(template)}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleCustomizeTemplate(template)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                  )}
                  
                  {isPaused && (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        onClick={() => handleTemplateAction(template)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleCustomizeTemplate(template)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Customize
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActivityTab = () => {
    // Mock activity data - in a real app, this would come from an API
    const activityData = [
      // Empty for now to show empty state
    ];

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Date Range:</label>
              <select className="text-sm border border-slate-300 rounded-md px-3 py-1">
                <option>Last 24 hours</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Template:</label>
              <select className="text-sm border border-slate-300 rounded-md px-3 py-1">
                <option>All Templates</option>
                <option>Job Completed</option>
                <option>Invoice Paid</option>
                <option>Service Reminder</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Status:</label>
              <select className="text-sm border border-slate-300 rounded-md px-3 py-1">
                <option>All Status</option>
                <option>Success</option>
                <option>Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-600">Chronological log of automation sends and failures</p>
          </div>
          
          {activityData.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No activity yet — enable a template</h3>
              <p className="text-slate-600 mb-6">Once you enable templates and they start sending, activity will appear here</p>
              <Button
                onClick={() => setMainTab('templates')}
                className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Go to Templates
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {activityData.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.status === 'success' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {activity.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {activity.sequence} → {activity.customer}
                        </p>
                        <p className="text-sm text-slate-600">{activity.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };


  const handleConnectZapier = async () => {
    try {
      // Open existing connect flow - could be a modal or external link
      setShowOnboarding(true);
      
      // After successful connection, the defaults initialization will happen automatically
      // via the /api/zapier/upsert-customer endpoint when the first customer is imported
      // or via the /api/csv/import endpoint when CSV is imported
      
      // For now, we'll just show the onboarding modal
      // In a real implementation, this would handle the actual Zapier OAuth flow
    } catch (error) {
      console.error('Error connecting to Zapier:', error);
      toastError('Failed to connect to Zapier');
    }
  };

  const handleViewActivity = () => {
    // Scroll to ActivityFeed section
    const activitySection = document.getElementById('activity-feed');
    if (activitySection) {
      activitySection.scrollIntoView({ behavior: 'smooth' });
    }
  };


  const renderKPIBar = () => {
    // Show skeleton while loading
    if (kpisLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      );
    }

    // Show error state
    if (kpisError) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative overflow-visible rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="text-center">
              <div className="text-sm text-red-600 mb-2">Error loading metrics</div>
              <div className="text-xs text-red-500">Please try refreshing the page</div>
            </div>
          </div>
          <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">-</div>
              <div className="text-sm text-slate-500">No data</div>
            </div>
          </div>
          <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 mb-1">-</div>
              <div className="text-sm text-slate-500">No data</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Sequences */}
        <button
          onClick={() => handleKpiClick('activeSequences')}
          className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-[0_8px_25px_rgba(26,115,232,0.15)] hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={`${kpis.activeSequences} active sequences. Click to view active sequences.`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Active Sequences</h3>
            <Play className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
            {kpis.activeSequences}
          </div>
          <p className="text-sm text-slate-500">Currently running</p>
        </button>

        {/* Customers in Sequences */}
        <button
          onClick={() => handleKpiClick('customersInSequences')}
          className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-[0_8px_25px_rgba(34,197,94,0.15)] hover:border-green-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label={`${kpis.customersInSequences} customers in sequences. Click to view sequences with active enrollments.`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Customers in Sequences</h3>
            <Users className="h-4 w-4 text-slate-400 group-hover:text-green-500 transition-colors duration-200" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors duration-200">
            {kpis.customersInSequences}
          </div>
          <p className="text-sm text-slate-500">Active now</p>
        </button>

        {/* Conversion Rate */}
        <button
          onClick={() => handleKpiClick('conversionRate')}
          className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-[0_8px_25px_rgba(168,85,247,0.15)] hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label={`${kpis.conversionRate7d}% conversion rate. Click to view logs for the last 7 days.`}
          title="Percentage of review requests that resulted in reviews in the last 7 days. Click to view detailed logs."
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Conversion Rate</h3>
            <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-purple-500 transition-colors duration-200" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors duration-200">
            {kpis.conversionRate7d}%
          </div>
          <p className="text-sm text-slate-500">Last 7 days</p>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg">
              Click to view logs
            </div>
          </div>
        </button>
      </div>
    );
  };

  const renderOnboardingBanner = () => {
    // Show skeleton while loading
    if (zapierLoading || loading) {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      );
    }

    // Not connected to Zapier
    if (!isZapierConnected) {
      return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">🚀 Ready to automate your review requests?</h3>
              <p className="text-slate-600">Connect to Zapier to automatically trigger review requests when customers complete jobs, pay invoices, or schedule services</p>
              <button 
                onClick={() => window.open('https://help.myblipp.com/automations', '_blank')}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors duration-200"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Why this matters</span>
              </button>
            </div>
            <Button
              onClick={handleConnectZapier}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Zap className="h-4 w-4 mr-2" />
              Connect to Zapier
            </Button>
          </div>
        </div>
      );
    }

    // Connected but no sequences enabled
    const enabledSequences = sequences.filter(seq => seq.status === 'active');
    if (isZapierConnected && enabledSequences.length === 0) {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">✨ Choose a quick start recipe</h3>
              <p className="text-slate-600">You're connected! Pick from our pre-built automation templates below to start collecting reviews automatically</p>
              <button 
                onClick={() => {
                  const recipesSection = document.getElementById('recipes-heading');
                  if (recipesSection) {
                    recipesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors duration-200"
              >
                <ArrowDown className="h-3 w-3" />
                <span>Scroll to recipes</span>
              </button>
            </div>
            <Button
              onClick={() => {
                const recipesSection = document.getElementById('recipes-heading');
                if (recipesSection) {
                  recipesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              Choose a quick start
            </Button>
          </div>
        </div>
      );
    }

    // Connected and sequences exist - success state
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">🎉 Automations are running!</h3>
            <p className="text-slate-600">You have {enabledSequences.length} active sequence{enabledSequences.length !== 1 ? 's' : ''} collecting reviews automatically. Check the activity feed below to see recent activity.</p>
            <button 
              onClick={() => {
                const activitySection = document.getElementById('activity-feed');
                if (activitySection) {
                  activitySection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors duration-200"
            >
              <ArrowDown className="h-3 w-3" />
              <span>View activity</span>
            </button>
          </div>
          <Button
            onClick={() => {
              const activitySection = document.getElementById('activity-feed');
              if (activitySection) {
                activitySection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Eye className="h-4 w-4 mr-2" />
            View activity
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30">
      <div className="px-6 py-6">
        {renderHeader()}
        {renderMainTabs()}
        
        
        {renderMainContent()}
      </div>

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

      {/* Setup Guide Drawer */}
      <SetupGuideDrawer
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
        onConnectZapier={handleSetupGuideConnect}
        onCreateSequence={handleSetupGuideCreateSequence}
        onViewLogs={handleSetupGuideViewLogs}
      />

      {/* Automation Wizard */}
      <AutomationWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
        onSequenceCreated={handleSequenceCreated}
      />

      {/* Toast Container */}
      <ToastProvider>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </ToastProvider>
    </div>
  );
}
