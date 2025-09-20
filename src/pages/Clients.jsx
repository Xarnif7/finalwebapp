import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Users, TrendingUp, UserCheck, Search, Upload, Edit, Archive, Trash2, Calendar, Mail, Phone, MoreVertical, Send, PlayCircle } from "lucide-react";
import { useCustomersData } from "@/hooks/useCustomersData";
import CustomerFormModal from "../components/clients/CustomerFormModal";
import { supabase } from "@/lib/supabase/browser";
import CsvImportDialog from "../components/clients/CsvImportDialog";
import PageHeader from "@/components/ui/PageHeader";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { toast } from "react-hot-toast";
import ZapierCrmCard from "../components/zapier/ZapierCrmCard";
import { useAuth } from "../components/auth/AuthProvider";
import { useCurrentBusinessId } from "../lib/tenancy";

export default function ClientsPage() {
  const { user } = useAuth();
  const { businessId, loading: businessLoading, error: businessError } = useCurrentBusinessId();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    customers,
    loading: customersLoading,
    error: customersError,
    total,
    queryParams,
    updateQueryParams,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    unarchiveCustomer,
    deleteCustomer,
    importCsv,
    refresh,
  } = useCustomersData();

  // Stats state
  const [stats, setStats] = useState({
    total_customers: 0,
    new_this_month: 0,
    conversion_rate: null,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch stats
  useEffect(() => {
    if (businessId) {
      fetchStats();
    }
  }, [businessId]);

  const fetchStats = async () => {
    if (!businessId) return;

    try {
      // Get total customers
      const { count: totalCustomers, error: totalError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active');

      if (totalError) {
        console.error('Total customers error:', totalError);
        return;
      }

      // Get new customers this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newThisMonth, error: newMonthError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active')
        .gte('created_at', startOfMonth.toISOString());

      if (newMonthError) {
        console.error('New month customers error:', newMonthError);
        return;
      }

      setStats({
        total_customers: totalCustomers || 0,
        new_this_month: newThisMonth || 0,
        conversion_rate: null, // Placeholder for future implementation
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateCustomer = async (customerData) => {
    console.log('Creating customer with data:', customerData);
    setLoading(true);
    try {
      const result = await createCustomer(customerData);
      console.log('Customer created successfully:', result);
      toast.success('Customer created successfully');
      await fetchStats(); // Refresh stats
      await refresh(); // Refresh customer list
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (customerData) => {
    setLoading(true);
    try {
      await updateCustomer(editingCustomer.id, customerData);
      toast.success('Customer updated successfully');
      setEditingCustomer(null);
    } catch (error) {
      toast.error(error.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to archive this customer? This action can be undone later.')) {
      try {
        await archiveCustomer(customerId);
        toast.success('Customer archived successfully');
        await fetchStats(); // Refresh stats
      } catch (error) {
        toast.error(error.message || 'Failed to archive customer');
      }
    }
  };

  const handleUnarchiveCustomer = async (customerId) => {
    try {
      await unarchiveCustomer(customerId);
      toast.success('Customer unarchived successfully');
      await fetchStats(); // Refresh stats
    } catch (error) {
      toast.error(error.message || 'Failed to unarchive customer');
    }
  };

  const handleImportCsv = async (processedRows, progressCallback, autoEnrollParams) => {
    setLoading(true);
    try {
      const results = await importCsv(processedRows, progressCallback, autoEnrollParams);
      let message = `Import completed: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped`;
      
      if (results.enrollmentSummary) {
        const { enrolled, skipped } = results.enrollmentSummary;
        message += ` | Auto-enrollment: ${enrolled} enrolled, ${skipped} skipped`;
      }
      
      toast.success(message);
      await fetchStats(); // Refresh stats
    } catch (error) {
      toast.error(error.message || 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateQueryParams({ search: value });
        }, 200);
      };
    })(),
    [updateQueryParams]
  );

  const handleSearch = (value) => {
    debouncedSearch(value);
  };

  const handleDeleteCustomer = async (customerId) => {
    // Always show confirmation dialog - no "don't show again" option
    if (window.confirm('Are you sure you want to permanently delete this customer? This action cannot be undone.')) {
      try {
        await deleteCustomer(customerId);
        toast.success('Customer deleted successfully');
        await fetchStats(); // Refresh stats
      } catch (error) {
        toast.error(error.message || 'Failed to delete customer');
      }
    }
  };

  const handleStatusFilter = (status) => {
    updateQueryParams({ status });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-slate-100 text-slate-800',
      archived: 'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status] || 'bg-slate-100 text-slate-800'}`}>
        {status}
      </span>
    );
  };

  const [segment, setSegment] = useState('all');
  const [bulkSelection, setBulkSelection] = useState([]);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const segmentsEnabled = isFeatureEnabled('customersSegments');

  // Multi-select handlers
  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleBulkArchive = async () => {
    if (window.confirm(`Are you sure you want to archive ${selectedCustomers.length} customer(s)? This action can be undone later.`)) {
      try {
        setLoading(true);
        for (const customerId of selectedCustomers) {
          await archiveCustomer(customerId);
        }
        toast.success(`${selectedCustomers.length} customer(s) archived successfully`);
        setSelectedCustomers([]);
        await fetchStats(); // Refresh stats
      } catch (error) {
        console.error('Error bulk archiving customers:', error);
        toast.error('Failed to archive some customers');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete ${selectedCustomers.length} customer(s)? This action cannot be undone.`)) {
      try {
        setLoading(true);
        for (const customerId of selectedCustomers) {
          await deleteCustomer(customerId);
        }
        toast.success(`${selectedCustomers.length} customer(s) deleted successfully`);
        setSelectedCustomers([]);
        await fetchStats(); // Refresh stats
      } catch (error) {
        console.error('Error bulk deleting customers:', error);
        toast.error('Failed to delete some customers');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkSendReview = async () => {
    // Implementation for bulk send review request
    console.log('Bulk send review request to customers:', selectedCustomers);
  };

  const handleAddToSequence = async (customer) => {
    // Implementation for adding customer to a sequence
    console.log('Add customer to sequence:', customer);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Show bulk actions when customers are selected
  useEffect(() => {
    setShowBulkActions(selectedCustomers.length > 0);
  }, [selectedCustomers]);

  async function previewBulkMagic() {
    if (!businessId) return;
    
    const ids = bulkSelection.length ? bulkSelection : customers.map(c => c.id);
    const res = await fetch('/api/review-requests/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        items: ids.map(id => ({ customerId: id, channel: 'sms', strategy: 'magic' })),
        dryRun: true,
      }),
    });
    if (res.ok) setBulkPreview(await res.json());
  }

  async function scheduleBulkMagic() {
    if (!businessId) return;
    
    const ids = bulkSelection.length ? bulkSelection : customers.map(c => c.id);
    await fetch('/api/review-requests/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        items: ids.map(id => ({ customerId: id, channel: 'sms', strategy: 'magic' })),
        dryRun: false,
      }),
    });
    setBulkPreview(null);
    setBulkSelection([]);
    toast.success('Magic send scheduled');
  }

  // Show business error state
  if (businessError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description="Manage your customer relationships and track their information"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-red-600">
              <div className="text-lg font-medium mb-2">Business Access Error</div>
              <div className="text-sm">{businessError}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Please contact support if this issue persists.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while business is loading
  if (businessLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Customers"
          description="Manage your customer relationships and track their information"
        />
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <PageHeader
        title="Customers"
        subtitle="Manage your customer relationships and track their information"
      />
      
      {/* Zapier CRM Connection Card */}
      <div className="mb-6">
        <ZapierCrmCard userId={user?.id} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
        <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_12px_35px_rgba(59,130,246,0.25),0_6px_20px_rgba(139,92,246,0.15),0_2px_8px_rgba(59,130,246,0.1)] motion-reduce:transform-none motion-reduce:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">Total Customers</h3>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900 mb-1">{stats.total_customers}</div>
              <p className="text-sm text-slate-500">
                Active customers in your database
              </p>
            </>
          )}
        </div>

        <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_12px_35px_rgba(59,130,246,0.25),0_6px_20px_rgba(139,92,246,0.15),0_2px_8px_rgba(59,130,246,0.1)] motion-reduce:transform-none motion-reduce:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">New This Month</h3>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900 mb-1">{stats.new_this_month}</div>
              <p className="text-sm text-slate-500">
                Customers added this month
              </p>
            </>
          )}
        </div>

        <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_12px_35px_rgba(59,130,246,0.25),0_6px_20px_rgba(139,92,246,0.15),0_2px_8px_rgba(59,130,246,0.1)] motion-reduce:transform-none motion-reduce:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">Conversion Rate</h3>
            <UserCheck className="h-4 w-4 text-slate-400" />
          </div>
          {statsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {stats.conversion_rate ? `${stats.conversion_rate}%` : 'N/A'}
              </div>
              <p className="text-sm text-slate-500">
                Lead to customer conversion
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={queryParams.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={queryParams.status}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowImport(true)}
            variant="outline"
            disabled={loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={loading}
            className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] hover:from-[#1557B0] hover:to-[#6D28D9] text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Segments & Bulk Magic */}
      {segmentsEnabled && (
        <Card>
          <CardHeader><CardTitle>Segments & Bulk Magic</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {['all','new','engaged','needs_nudge','detractors'].map(s => (
                <Button key={s} variant={segment===s?"default":"outline"} size="sm" onClick={()=>{setSegment(s); updateQueryParams({ segment: s });}}>{s.replace('_',' ')}</Button>
              ))}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={previewBulkMagic}>Preview Magic</Button>
                <Button size="sm" onClick={scheduleBulkMagic}>Schedule Magic</Button>
              </div>
            </div>
            {bulkPreview && (
              <div className="max-h-48 overflow-y-auto text-xs bg-slate-50 p-3 rounded">
                <pre>{JSON.stringify(bulkPreview.previews?.slice(0,10), null, 2)}{bulkPreview.previews?.length>10?'\n…':''}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customers Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Customers ({total})</h3>
        </div>
        <div className="p-6">
          {customersError && (
            <div className="text-red-500 mb-4 p-4 bg-red-50 rounded-lg">
              <div className="font-medium">Error loading customers</div>
              <div className="text-sm">{customersError}</div>
              <Button 
                onClick={refresh} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {customersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {customersError ? (
                "Unable to load customers. Please try again."
              ) : (
                <>
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <div className="text-lg font-medium mb-2">No customers found</div>
                  <div className="text-sm mb-4">Get started by adding your first customer or importing a CSV file.</div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-white sticky top-0 z-10">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 w-12">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.length === customers.length && customers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Service Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Tags</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{customer.full_name}</div>
                          {customer.notes && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {customer.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          {formatDate(customer.service_date)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative dropdown-container">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveDropdown(activeDropdown === customer.id ? null : customer.id)}
                            className="p-1"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {activeDropdown === customer.id && (
                            <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1">
                              <button
                                onClick={() => {
                                  setEditingCustomer(customer);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Customer
                              </button>
                              <button
                                onClick={() => {
                                  handleAddToSequence(customer);
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                              >
                                <PlayCircle className="h-4 w-4 mr-2 text-blue-600" />
                                Add to Sequence
                              </button>
                              <button
                                onClick={() => {
                                  // Send review request functionality
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send Review Request
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => {
                                  if (customer.status === 'archived') {
                                    handleUnarchiveCustomer(customer.id);
                                  } else {
                                    handleArchiveCustomer(customer.id);
                                  }
                                  setActiveDropdown(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                {customer.status === 'archived' ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteCustomer(customer.id);
                                  setActiveDropdown(null);
                                }}
                                disabled={loading}
                                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 z-50">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-700">
                  {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkSendReview}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send Review Request
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkArchive}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDelete}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCustomers([])}
                    className="text-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerFormModal
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleCreateCustomer}
        loading={loading}
      />

      <CustomerFormModal
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onSubmit={handleUpdateCustomer}
        customer={editingCustomer}
        loading={loading}
      />

      <CsvImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={handleImportCsv}
        loading={loading}
      />

    </div>
  );
}


