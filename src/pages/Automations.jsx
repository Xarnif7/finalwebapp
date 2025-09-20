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
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { useSequencesData } from '../hooks/useSequencesData';
import { useZapierStatus } from '../hooks/useZapierStatus';
import { useAutomationKPIs } from '../hooks/useAutomationKPIs';
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
import SetupGuideDrawer from '../components/automations/SetupGuideDrawer';
import MyActiveSequences from '../components/automations/MyActiveSequences';
import ActivityFeed from '../components/automations/ActivityFeed';
import AutomationWizard from '../components/automations/AutomationWizard';
import { useAutomationMetrics } from '../hooks/useAutomationMetrics';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import { Skeleton } from '../components/ui/skeleton';

export default function AutomationsPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('overview'); // New main tab switcher
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
  const { isConnected: isZapierConnected, loading: zapierLoading } = useZapierStatus();
  const { metrics, loading: metricsLoading } = useAutomationMetrics();
  const { kpis, loading: kpisLoading, error: kpisError } = useAutomationKPIs();
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { toasts, toastSuccess, toastError, removeToast } = useToast();


  const mainTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'manage', label: 'Manage', icon: Settings }
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
      
      <div className="flex items-center space-x-3">
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
              aria-label="View Zapier integrations"
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
          onClick={() => setShowSetupGuide(true)}
          className="text-blue-600 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Open setup guide"
        >
          Setup Guide
        </Button>
        <Button
          onClick={handleCreateSequence}
          className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Create new automation sequence"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
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

  const renderOverviewTab = () => (
    <div className="space-y-10" role="tabpanel" id="overview-panel" aria-labelledby="overview-tab">
      {/* OnboardingBanner */}
      <section aria-labelledby="onboarding-heading">
        {renderOnboardingBanner()}
      </section>

      {/* KPIBar */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        {renderKPIBar()}
      </section>

      {/* QuickStartRecipeGrid */}
      <section aria-labelledby="recipes-heading">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="recipes-heading" className="text-2xl font-semibold text-slate-900">Quick Start Recipes</h2>
            <p className="text-sm text-slate-600">Pre-built automation templates to get you started</p>
          </div>
          <Button
            onClick={handleOpenWizard}
            variant="outline"
            className="flex items-center space-x-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom</span>
          </Button>
        </div>
        <RecipeCards 
          isZapierConnected={isZapierConnected}
          onSequenceCreated={handleRecipeSequenceCreated}
          onConnectZapier={handleConnectZapier}
        />
      </section>

      {/* MyActiveSequences */}
      <section id="my-active-sequences" aria-labelledby="active-sequences-heading">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="active-sequences-heading" className="text-2xl font-semibold text-slate-900">My Active Sequences</h2>
            <p className="text-sm text-slate-600 mt-1">Currently running automation sequences</p>
          </div>
          <Button
            onClick={() => setMainTab('manage')}
            variant="outline"
            size="sm"
            className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View All
          </Button>
        </div>
        <MyActiveSequences
          onViewAll={() => setMainTab('manage')}
          onEdit={handleEditSequence}
          onPause={handlePauseSequence}
          onResume={handleResumeSequence}
        />
      </section>

      {/* ActivityFeed */}
      <section id="activity-feed" aria-labelledby="activity-heading">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="activity-heading" className="text-2xl font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-sm text-slate-600 mt-1">Latest automation events and messages</p>
          </div>
        </div>
        <ActivityFeed
          onViewSequence={handleViewSequence}
          onViewCustomer={handleViewCustomer}
        />
      </section>
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
    if (mainTab === 'overview') {
      return renderOverviewTab();
    } else {
      // Manage tab - show the original content
      return (
        <div>
          {renderTabs()}
          {renderTabContent()}
        </div>
      );
    }
  };

  const handleDismissAlert = () => {
    setDismissedAlerts(prev => new Set([...prev, 'failure-rate']));
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderHeader()}
        {renderMainTabs()}
        
        {/* Alert Banner - only show on Overview tab */}
        {mainTab === 'overview' && metrics.hasAlert && !dismissedAlerts.has('failure-rate') && (
          <div className="mb-8">
            <AlertBanner 
              metrics={metrics} 
              onDismiss={handleDismissAlert}
            />
          </div>
        )}
        
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
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
