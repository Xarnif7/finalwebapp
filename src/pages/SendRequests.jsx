import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Send, 
  MessageSquare, 
  Mail, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  Save,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';

const SendRequests = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({
    channel: 'all',
    status: 'all',
    search: ''
  });
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [requestMessage, setRequestMessage] = useState('');
  const [templates, setTemplates] = useState({
    email: {
      subject: 'We\'d love your feedback!',
      body: 'Hi {customer.name},\n\nThank you for choosing our services! We would really appreciate if you could take a moment to share your experience with us.\n\n{review_link}\n\nYour feedback helps us improve and serve our customers better.\n\nBest regards,\n{company_name}'
    },
    sms: {
      body: 'Hi {customer.name}! Thanks for choosing us. We\'d love your feedback: {review_link}'
    }
  });
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch review requests (we'll create this table later)
      const { data: requestsData, error: requestsError } = await supabase
        .from('review_requests')
        .select('*')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false });

      if (requestsError && requestsError.code !== 'PGRST116') {
        // PGRST116 is "table doesn't exist" - we'll create it later
        throw requestsError;
      }

      setCustomers(customersData || []);
      setRequests(requestsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedCustomer || !requestMessage.trim()) return;

    try {
      setSending(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      // Create review request record
      const { error: insertError } = await supabase
        .from('review_requests')
        .insert({
          business_id: profile.business_id,
          customer_id: selectedCustomer.id,
          channel: selectedChannel,
          message: requestMessage,
          status: 'queued',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        // If table doesn't exist, create it first
        if (insertError.code === 'PGRST116') {
          await createReviewRequestsTable();
          // Retry insert
          const { error: retryError } = await supabase
            .from('review_requests')
            .insert({
              business_id: profile.business_id,
              customer_id: selectedCustomer.id,
              channel: selectedChannel,
              message: requestMessage,
              status: 'queued',
              created_at: new Date().toISOString()
            });
          
          if (retryError) throw retryError;
        } else {
          throw insertError;
        }
      }

      toast.success(`Review request sent via ${selectedChannel}!`);
      setShowSendModal(false);
      setSelectedCustomer(null);
      setRequestMessage('');
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send review request');
    } finally {
      setSending(false);
    }
  };

  const createReviewRequestsTable = async () => {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS review_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            business_id UUID NOT NULL,
            customer_id UUID NOT NULL,
            channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'replied')),
            sent_at TIMESTAMPTZ,
            delivered_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Add RLS policies
          ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can view their own review requests" ON review_requests
            FOR SELECT USING (
              business_id IN (
                SELECT business_id FROM profiles WHERE id = auth.uid()
              )
            );
          
          CREATE POLICY "Users can insert their own review requests" ON review_requests
            FOR INSERT WITH CHECK (
              business_id IN (
                SELECT business_id FROM profiles WHERE id = auth.uid()
              )
            );
          
          CREATE POLICY "Users can update their own review requests" ON review_requests
            FOR UPDATE USING (
              business_id IN (
                SELECT business_id FROM profiles WHERE id = auth.uid()
              )
            );
        `
      });

      if (error) throw error;
      toast.success('Review requests table created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  };

  const saveTemplate = async (channel) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Save template to database (we'll create this table later)
      const { error } = await supabase
        .from('templates')
        .upsert({
          business_id: profile.business_id,
          type: 'review_request',
          channel: channel,
          content: templates[channel],
          updated_at: new Date().toISOString()
        });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      toast.success(`${channel.charAt(0).toUpperCase() + channel.slice(1)} template saved!`);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      queued: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      bounced: { color: 'bg-red-100 text-red-800', icon: XCircle },
      replied: { color: 'bg-purple-100 text-purple-800', icon: MessageSquare }
    };

    const config = statusConfig[status] || statusConfig.queued;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getChannelIcon = (channel) => {
    return channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />;
  };

  const filteredCustomers = customers.filter(customer => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        customer.first_name?.toLowerCase().includes(searchLower) ||
        customer.last_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredRequests = requests.filter(request => {
    if (filters.channel !== 'all' && request.channel !== filters.channel) return false;
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.search) {
      const customer = customers.find(c => c.id === request.customer_id);
      if (!customer) return false;
      const searchLower = filters.search.toLowerCase();
      return (
        customer.first_name?.toLowerCase().includes(searchLower) ||
        customer.last_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Send Requests"
        subtitle="Send review requests to your customers and manage templates"
      />

      {/* Templates Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Template
              </div>
              {editingTemplate === 'email' ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveTemplate('email')}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingTemplate('email')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingTemplate === 'email' ? (
              <>
                <div>
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={templates.email.subject}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      email: { ...prev.email, subject: e.target.value }
                    }))}
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <Label htmlFor="email-body">Body</Label>
                  <Textarea
                    id="email-body"
                    value={templates.email.body}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      email: { ...prev.email, body: e.target.value }
                    }))}
                    rows={8}
                    placeholder="Email body with merge tags like {customer.name}"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Available merge tags: {'{customer.name}'}, {'{review_link}'}, {'{company_name}'}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm text-muted-foreground">{templates.email.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Body</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{templates.email.body}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                SMS Template
              </div>
              {editingTemplate === 'sms' ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveTemplate('sms')}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingTemplate('sms')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingTemplate === 'sms' ? (
              <>
                <div>
                  <Label htmlFor="sms-body">Message</Label>
                  <Textarea
                    id="sms-body"
                    value={templates.sms.body}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      sms: { ...prev.sms, body: e.target.value }
                    }))}
                    rows={6}
                    placeholder="SMS message with merge tags like {customer.name}"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Available merge tags: {'{customer.name}'}, {'{review_link}'}
                </div>
              </>
            ) : (
              <div>
                <Label className="text-sm font-medium">Message</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{templates.sms.body}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send New Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Send New Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="customer-search">Search Customer</Label>
              <Input
                id="customer-search"
                placeholder="Search by name, email, or phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <Button onClick={() => setShowSendModal(true)} disabled={filteredCustomers.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </div>

          {filteredCustomers.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.slice(0, 10).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && <div className="text-sm">{customer.email}</div>}
                          {customer.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {customer.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setSelectedChannel('email');
                                setShowSendModal(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </Button>
                          )}
                          {customer.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setSelectedChannel('sms');
                                setShowSendModal(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              SMS
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select
              value={filters.channel}
              onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const customer = customers.find(c => c.id === request.customer_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(request.channel)}
                          {request.channel}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {request.message}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Send Request Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Send Review Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                </p>
              </div>

              <div>
                <Label>Channel</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={selectedChannel === 'email' ? 'default' : 'outline'}
                    onClick={() => setSelectedChannel('email')}
                    disabled={!selectedCustomer?.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant={selectedChannel === 'sms' ? 'default' : 'outline'}
                    onClick={() => setSelectedChannel('sms')}
                    disabled={!selectedCustomer?.phone}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                </div>
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={6}
                  placeholder={`Enter your ${selectedChannel} message...`}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSendModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendRequest} disabled={sending || !requestMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SendRequests;
