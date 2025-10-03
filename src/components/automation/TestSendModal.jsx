import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Mail, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

const TestSendModal = ({ isOpen, onClose, template, business, isLoadingBusiness = false }) => {
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('🧪 TestSendModal props:', { isOpen, template, business });
  }, [isOpen, template, business]);

  // Initialize custom message with template message when modal opens
  React.useEffect(() => {
    if (isOpen && template) {
      const templateMessage = template.config_json?.message || template.message || 'Thank you for your business!';
      console.log('🧪 TestSendModal initializing message:', { template, templateMessage });
      setCustomMessage(templateMessage);
    }
  }, [isOpen, template]);

  const handleSend = async () => {
    console.log('🚀 TestSendModal handleSend clicked!', { 
      testEmail, 
      testPhone, 
      business, 
      template, 
      customMessage,
      hasCustomMessage: !!customMessage?.trim()
    });
    
    if (!testEmail && !testPhone) {
      console.log('🚀 No email or phone provided');
      toast.error('Please enter an email address or phone number');
      return;
    }

    if (!business?.id) {
      console.log('🚀 No business ID found:', business);
      toast.error('Business information not available. Please try again.');
      return;
    }

    if (!customMessage?.trim()) {
      console.log('🚀 No custom message provided:', customMessage);
      toast.error('Please enter a message to send');
      return;
    }

    console.log('🚀 Business data looks good:', business);
    console.log('🚀 Custom message looks good:', customMessage);

    console.log('🚀 Starting send process...');
    setSending(true);

    try {
      console.log('🚀 Finding or creating test customer...', { businessId: business.id, testEmail, testPhone });
      
      // First, try to find existing customer with this email
      let testCustomer;
      const { data: existingCustomer, error: findError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .eq('email', testEmail)
        .single();

      if (existingCustomer && !findError) {
        console.log('🚀 Found existing customer:', existingCustomer);
        testCustomer = existingCustomer;
      } else {
        console.log('🚀 No existing customer found, creating new one...');
        
        // Create a new customer with unique email to avoid conflicts
        const uniqueEmail = `test-${Date.now()}@${testEmail.split('@')[1]}`;
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: business.id,
            full_name: 'Test Customer',
            email: uniqueEmail,
            phone: testPhone || null,
            status: 'active',
            created_by: business.id
          })
          .select()
          .single();

        if (customerError) {
          console.error('🚀 Customer creation error:', customerError);
          throw new Error('Failed to create test customer: ' + customerError.message);
        }

        console.log('🚀 New test customer created:', newCustomer);
        testCustomer = newCustomer;
      }

      // Get auth token
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      console.log('🚀 Auth token:', token ? 'Present' : 'Missing');

      // Determine if it's email or SMS and use appropriate endpoint
      const isPhoneNumber = testPhone && !testEmail;
      const endpoint = isPhoneNumber ? '/api/test-sms' : '/api/send-test';
      
      console.log('🚀 Calling API endpoint:', endpoint, {
        businessId: business.id,
        to: testEmail || testPhone,
        message: customMessage,
        messageLength: customMessage?.length,
        isPhoneNumber
      });

      const requestBody = {
        businessId: business.id,
        to: testEmail || testPhone,
        message: customMessage
      };

      console.log('🚀 Request body:', requestBody);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🚀 API response status:', response.status);
      const result = await response.json();
      console.log('🚀 API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test message');
      }

      setSent(true);
      toast.success(`Test ${testEmail ? 'email' : 'SMS'} sent successfully to ${testEmail || testPhone}!`);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error) {
      console.error('🚀 Error sending test message:', error);
      console.error('🚀 Error details:', {
        message: error.message,
        stack: error.stack,
        business: business,
        template: template
      });
      toast.error('Failed to send test message: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTestEmail('');
    setTestPhone('');
    setCustomMessage('');
    setSending(false);
    setSent(false);
    onClose();
  };

  const getChannelIcon = () => {
    if (testEmail) return <Mail className="w-4 h-4" />;
    if (testPhone) return <MessageSquare className="w-4 h-4" />;
    return <Mail className="w-4 h-4" />;
  };

  const getChannelText = () => {
    if (testEmail) return 'Email';
    if (testPhone) return 'SMS';
    return 'Email';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Test Send Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{template?.name}</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Send yourself a test email to see how it looks!
            </p>
          </div>

          {/* Contact Input */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                  if (e.target.value) setTestPhone(''); // Clear phone if email entered
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testPhone">Phone Number (SMS)</Label>
              <Input
                id="testPhone"
                type="tel"
                placeholder="+1234567890"
                value={testPhone}
                onChange={(e) => {
                  setTestPhone(e.target.value);
                  if (e.target.value) setTestEmail(''); // Clear email if phone entered
                }}
                className="mt-1"
              />
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <Label htmlFor="customMessage">Message Content</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="mt-1 min-h-[100px]"
              placeholder="Enter your message here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              You can customize the message before sending
            </p>
          </div>

          {/* Send Confirmation */}
          {(testEmail || testPhone) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">
                  Send to <strong>{testEmail || testPhone}</strong> via {getChannelText()}?
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              console.log('🚀 Send button clicked!', { testEmail, testPhone, sending, sent });
              handleSend();
            }} 
            disabled={sending || (!testEmail && !testPhone) || sent || isLoadingBusiness}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sent!
              </>
            ) : isLoadingBusiness ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                {getChannelIcon()}
                <span className="ml-2">Send Test {getChannelText()}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestSendModal;
