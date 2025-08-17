import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { sendRequest } from '@/api/functions'; 

const SendMessageModal = ({ isOpen, onClose, client, businessId, mode }) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (client && mode) {
      const defaultMessage = `Hi ${client.first_name},\n\nWe hope you enjoyed your recent visit. We would be grateful if you could take a moment to share your feedback.\n\nThank you!`;
      setMessage(defaultMessage);
      setError(null);
      setSuccess(false);
      setIsSending(false);
    }
  }, [client, mode]);

  const handleSend = async () => {
    if (!client || !businessId || !mode) return;
    
    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await sendRequest({
        clientId: client.id,
        businessId: businessId,
        method: mode,
        // message, // The backend function uses a template, not raw message
      });
      
      if (response.error) throw new Error(response.error);

      setSuccess(true);
      setTimeout(() => {
          onClose();
      }, 2000);
    } catch (e) {
      setError(e.message || `Failed to send ${mode}.`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {mode === 'sms' ? 'SMS' : 'Email'} to {client?.first_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              readOnly // The backend function uses a pre-defined template
            />
             <p className="text-xs text-gray-500">The message is based on your business template. Custom messages are not supported in this view.</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">Message sent successfully!</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || success}>
            {isSending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Send Message</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendMessageModal;


