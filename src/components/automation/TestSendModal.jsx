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

const TestSendModal = ({ isOpen, onClose, template, business }) => {
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Initialize custom message with template message when modal opens
  React.useEffect(() => {
    if (isOpen && template) {
      const templateMessage = template.config_json?.message || template.message || 'Thank you for your business!';
      setCustomMessage(templateMessage);
    }
  }, [isOpen, template]);

  const handleSend = async () => {
    if (!testEmail && !testPhone) {
      toast.error('Please enter an email address or phone number');
      return;
    }

    if (!business?.id) {
      toast.error('Business information not available');
      return;
    }

    setSending(true);

    try {
      // Create a temporary customer record for testing
      const { data: testCustomer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          business_id: business.id,
          full_name: 'Test Customer',
          email: testEmail || null,
          phone: testPhone || null,
          status: 'active',
          created_by: business.id,
          metadata: {
            source: 'test_send',
            test_mode: true
          }
        }, {
          onConflict: 'business_id,email'
        })
        .select()
        .single();

      if (customerError) {
        throw new Error('Failed to create test customer: ' + customerError.message);
      }

      // Send the test message
      const response = await fetch('/api/automation/send-immediate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          customerId: testCustomer.id,
          templateId: template.id,
          message: customMessage,
          channel: testEmail ? 'email' : 'sms'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test message');
      }

      setSent(true);
      toast.success(`Test ${testEmail ? 'email' : 'SMS'} sent successfully!`);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error sending test message:', error);
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
              <Badge variant="secondary">
                {template?.channels?.join(', ') || 'email'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Send this template message to test how it looks
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
            onClick={handleSend} 
            disabled={sending || (!testEmail && !testPhone) || sent}
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
