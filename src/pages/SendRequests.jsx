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
  RotateCcw,
  Smartphone,
  User,
  Phone,
  AtSign
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
    if (!selectedCustomer || !requestMessage.trim()) {
      toast.error('Please select a customer and enter a message');
      return;
    }

    // Validate contact info based on selected channel
    if (selectedChannel === 'email' && !selectedCustomer.email) {
      toast.error('Selected customer does not have an email address');
      return;
    }
    if (selectedChannel === 'sms' && !selectedCustomer.phone) {
      toast.error('Selected customer does not have a phone number');
      return;
    }
    if (selectedChannel === 'both' && !selectedCustomer.email && !selectedCustomer.phone) {
      toast.error('Selected customer does not have email or phone number');
      return;
    }

    try {
      setSending(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Generate review link
      const reviewLink = `https://yourdomain.com/review?ref=${selectedCustomer.id}`;

      // Insert review request record
      const { error } = await supabase
        .from('review_requests')
        .insert({
          business_id: profile.business_id,
          customer_id: selectedCustomer.id,
          channel: selectedChannel,
          review_link: reviewLink,
          email_status: selectedChannel === 'email' || selectedChannel === 'both' ? 'queued' : 'skipped',
          sms_status: selectedChannel === 'sms' || selectedChannel === 'both' ? 'queued' : 'skipped'
        });

      if (error) throw error;

      toast.success('Review request sent successfully!');
      setShowSendModal(false);
      setSelectedCustomer(null);
      setSelectedChannel('email');
      setRequestMessage('');
      await fetchData();
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const saveTemplate = async (type) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      const template = templates[type];
      
      // Validate SMS length
      if (type === 'sms' && template.body.length > 160) {
        toast.error('SMS message must be 160 characters or less');
        return;
      }

      // Check if template exists
      const { data: existingTemplate } = await supabase
        .from('templates')
        .select('id')
        .eq('business_id', profile.business_id)
        .eq('kind', type)
        .single();

      if (existingTemplate) {
        // Update existing template
        await supabase
          .from('templates')
          .update({
            subject: type === 'email' ? template.subject : null,
            body: template.body,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTemplate.id);
      } else {
        // Create new template
        await supabase
          .from('templates')
          .insert({
            business_id: profile.business_id,
            kind: type,
            subject: type === 'email' ? template.subject : null,
            body: template.body
          });
      }

      toast.success(`${type.toUpperCase()} template saved successfully!`);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'queued':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <Smartphone className="w-4 h-4" />;
      case 'both':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        customer.full_name?.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm)
      );
    }
    return true;
  });

  const filteredRequests = requests.filter(request => {
    if (filters.channel !== 'all' && request.channel !== filters.channel) return false;
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const customer = customers.find(c => c.id === request.customer_id);
      return (
        customer?.full_name?.toLowerCase().includes(searchTerm) ||
        customer?.email?.toLowerCase().includes(searchTerm) ||
        customer?.phone?.includes(searchTerm)
      );
    }
    return true;
  });

  const getCustomerContactInfo = (customer) => {
    const hasEmail = customer.email && customer.email.trim() !== '';
    const hasPhone = customer.phone && customer.phone.trim() !== '';
    
    return {
      hasEmail,
      hasPhone,
      email: hasEmail ? customer.email : null,
      phone: hasPhone ? customer.phone : null
    };
  };

  const getDefaultChannel = (customer) => {
    const contactInfo = getCustomerContactInfo(customer);
    if (contactInfo.hasEmail) return 'email';
    if (contactInfo.hasPhone) return 'sms';
    return 'email'; // fallback
  };

  const isSendButtonDisabled = () => {
    if (!selectedCustomer || !requestMessage.trim()) return true;
    
    const contactInfo = getCustomerContactInfo(selectedCustomer);
    
    switch (selectedChannel) {
      case 'email':
        return !contactInfo.hasEmail;
      case 'sms':
        return !contactInfo.hasPhone;
      case 'both':
        return !contactInfo.hasEmail && !contactInfo.hasPhone;
      default:
        return true;
    }
  };

  const getSendButtonError = () => {
    if (!selectedCustomer) return 'Please select a customer';
    if (!requestMessage.trim()) return 'Please enter a message';
    
    const contactInfo = getCustomerContactInfo(selectedCustomer);
    
    switch (selectedChannel) {
      case 'email':
        return !contactInfo.hasEmail ? 'Customer has no email address' : null;
      case 'sms':
        return !contactInfo.hasPhone ? 'Customer has no phone number' : null;
      case 'both':
        return (!contactInfo.hasEmail && !contactInfo.hasPhone) ? 'Customer has no email or phone number' : null;
      default:
        return 'Please select a channel';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Review Requests"
        subtitle="Request reviews from your customers via email and SMS"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Email & SMS Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Template
                </Label>
                <div className="flex gap-2">
                  {editingTemplate === 'email' ? (
                    <>
                      <Button size="sm" onClick={() => saveTemplate('email')}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate('email')}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {editingTemplate === 'email' ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Subject"
                    value={templates.email.subject}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      email: { ...prev.email, subject: e.target.value }
                    }))}
                  />
                  <Textarea
                    placeholder="Email body..."
                    value={templates.email.body}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      email: { ...prev.email, body: e.target.value }
                    }))}
                    rows={4}
                  />
                  <div className="text-xs text-gray-500">
                    Available variables: {'{customer.name}'}, {'{review_link}'}, {'{company_name}'}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm mb-1">{templates.email.subject}</div>
                  <div className="text-sm text-gray-600 line-clamp-3">{templates.email.body}</div>
                </div>
              )}
            </div>

            {/* SMS Template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  SMS Template
                </Label>
                <div className="flex gap-2">
                  {editingTemplate === 'sms' ? (
                    <>
                      <Button size="sm" onClick={() => saveTemplate('sms')}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate('sms')}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {editingTemplate === 'sms' ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="SMS message..."
                    value={templates.sms.body}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      sms: { ...prev.sms, body: e.target.value }
                    }))}
                    rows={3}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Available variables: {'{customer.name}'}, {'{review_link}'}
                    </span>
                    <span className={templates.sms.body.length > 160 ? 'text-red-500' : 'text-gray-500'}>
                      {templates.sms.body.length}/160
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">{templates.sms.body}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Send New Request Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send New Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowSendModal(true)} 
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Send Review Request
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Request History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Request History
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
              <Select value={filters.channel} onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const customer = customers.find(c => c.id === request.customer_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{customer?.full_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(request.channel)}
                          <span className="capitalize">{request.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.requested_at).toLocaleDateString()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Send Review Request</h2>
              <Button variant="outline" size="sm" onClick={() => setShowSendModal(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <Label className="block mb-3">Select Customer</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => {
                    const contactInfo = getCustomerContactInfo(customer);
                    const isSelected = selectedCustomer?.id === customer.id;
                    
                    return (
                      <div
                        key={customer.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSelectedChannel(getDefaultChannel(customer));
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{customer.full_name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {contactInfo.hasEmail ? (
                            <Badge variant="outline" className="text-xs">
                              <AtSign className="w-3 h-3 mr-1" />
                              {contactInfo.email}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <AtSign className="w-3 h-3 mr-1" />
                              No email
                            </Badge>
                          )}
                          {contactInfo.hasPhone ? (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              {contactInfo.phone}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              No phone
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <Label className="block mb-3">Channel</Label>
                <div className="flex gap-2">
                  {['email', 'sms', 'both'].map((channel) => {
                    const contactInfo = selectedCustomer ? getCustomerContactInfo(selectedCustomer) : { hasEmail: false, hasPhone: false };
                    const isDisabled = (
                      (channel === 'email' && !contactInfo.hasEmail) ||
                      (channel === 'sms' && !contactInfo.hasPhone) ||
                      (channel === 'both' && !contactInfo.hasEmail && !contactInfo.hasPhone)
                    );
                    
                    return (
                      <Button
                        key={channel}
                        variant={selectedChannel === channel ? 'default' : 'outline'}
                        onClick={() => setSelectedChannel(channel)}
                        disabled={isDisabled}
                        className="flex items-center gap-2"
                      >
                        {getChannelIcon(channel)}
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </Button>
                    );
                  })}
                </div>
                {selectedCustomer && (
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedChannel === 'email' && !getCustomerContactInfo(selectedCustomer).hasEmail && (
                      <span className="text-red-600">Customer has no email address</span>
                    )}
                    {selectedChannel === 'sms' && !getCustomerContactInfo(selectedCustomer).hasPhone && (
                      <span className="text-red-600">Customer has no phone number</span>
                    )}
                    {selectedChannel === 'both' && !getCustomerContactInfo(selectedCustomer).hasEmail && !getCustomerContactInfo(selectedCustomer).hasPhone && (
                      <span className="text-red-600">Customer has no email or phone number</span>
                    )}
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <Label className="block mb-3">Message</Label>
                <Textarea
                  placeholder="Enter your review request message..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSendModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendRequest}
                  disabled={isSendButtonDisabled() || sending}
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send Request
                </Button>
              </div>
              
              {getSendButtonError() && (
                <div className="text-sm text-red-600 text-center">
                  {getSendButtonError()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendRequests;
