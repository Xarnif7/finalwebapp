import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Users, TrendingUp, UserCheck, Search, Upload, Edit, Archive, Trash2, Calendar, Mail, Phone } from "lucide-react";
import { useCustomersData } from "@/hooks/useCustomersData";
import CustomerFormModal from "../components/clients/CustomerFormModal";
import { supabase } from "@/lib/supabaseClient";
import CsvImportDialog from "../components/clients/CsvImportDialog";
import PageHeader from "@/components/ui/PageHeader";
import { toast } from "react-hot-toast";

export default function ClientsPage() {
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
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's business_id from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.business_id) {
        console.error('Business not found');
        return;
      }

      // Get total customers
      const { count: totalCustomers, error: totalError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', profile.business_id)
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
        .eq('business_id', profile.business_id)
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
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateCustomer = async (customerData) => {
    setLoading(true);
    try {
      await createCustomer(customerData);
      toast.success('Customer created successfully');
      await fetchStats(); // Refresh stats
    } catch (error) {
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

  const handleImportCsv = async (processedRows, progressCallback) => {
    setLoading(true);
    try {
      const results = await importCsv(processedRows, progressCallback);
      toast.success(`Import completed: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped`);
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
      active: 'default',
      inactive: 'secondary',
      archived: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer relationships and track their information"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.total_customers}</div>
                <p className="text-xs text-muted-foreground">
                  Active customers in your database
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.new_this_month}</div>
                <p className="text-xs text-muted-foreground">
                  Customers added this month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats.conversion_rate ? `${stats.conversion_rate}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lead to customer conversion
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({total})</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowAddForm(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                    <Button onClick={() => setShowImport(true)} variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Contact</th>
                    <th className="text-left py-3 px-4 font-medium">Service Date</th>
                    <th className="text-left py-3 px-4 font-medium">Tags</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-muted/50">
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
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCustomer(customer)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveCustomer(customer.id)}
                            disabled={loading || customer.status === 'archived'}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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


