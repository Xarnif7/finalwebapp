import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { sendRequest } from '@/api/functions'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isFeatureEnabled } from '@/lib/featureFlags';

const SendMessageModal = ({ isOpen, onClose, client, businessId, mode }) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [strategy, setStrategy] = useState('immediate');
  const [preview, setPreview] = useState(null);

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
      if (isFeatureEnabled('magicSend') && strategy === 'magic') {
        const res = await fetch('/api/review-requests/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            items: [{ customerId: client.id, channel: mode, strategy: 'magic' }],
            dryRun: false,
          }),
        });
        if (!res.ok) throw new Error('Failed to schedule');
        setSuccess(true);
        setTimeout(() => { onClose(); }, 1500);
        return;
      } else {
        const response = await sendRequest({
          clientId: client.id,
          businessId: businessId,
          method: mode,
        });
        if (response.error) throw new Error(response.error);
        setSuccess(true);
        setTimeout(() => { onClose(); }, 1500);
        return;
      }
    } catch (e) {
      setError(e.message || `Failed to send ${mode}.`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePreview = async () => {
    if (!isFeatureEnabled('magicSend') || !client) return;
    try {
      const res = await fetch('/api/review-requests/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          items: [{ customerId: client.id, channel: mode, strategy: 'magic' }],
          dryRun: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to preview');
      const data = await res.json();
      setPreview(data.previews?.[0]?.best_send_at || null);
    } catch (e) {
      setError(e.message);
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
          {isFeatureEnabled('magicSend') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm">Strategy</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Strategy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="magic">Magic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {strategy === 'magic' && (
                  preview ? (
                    <div className="text-xs text-slate-600">Predicted: {new Date(preview).toLocaleString()}</div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handlePreview} className="rounded-xl">Preview Magic Time</Button>
                  )
                )}
              </div>
            </div>
          )}
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


