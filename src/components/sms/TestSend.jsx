import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { normalizeToE164, isLikelyE164 } from '../../lib/phone';

export default function TestSend({ businessId, fromNumber }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setLastResult(null);

    try {
      const normalizedPhone = normalizeToE164(phoneNumber);
      
      if (!normalizedPhone || !isLikelyE164(normalizedPhone)) {
        throw new Error('Invalid phone number format. Use format like +14155551234');
      }

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          to: normalizedPhone,
          body: message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send SMS');
      }

      console.log('[TEST_SEND] Success:', data);
      setLastResult({ success: true, data });
      toast.success('SMS sent successfully!');
      
      // Clear form
      setPhoneNumber('');
      setMessage('');

    } catch (err) {
      console.error('[TEST_SEND] Error:', err);
      setLastResult({ success: false, error: err.message });
      toast.error(err.message || 'Failed to send SMS');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Test SMS
        </CardTitle>
        <CardDescription>
          Send a test message from your toll-free number: {fromNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <Label htmlFor="phone">Recipient Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+14155551234"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={isSending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use E.164 format (e.g., +14155551234 for US numbers)
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your test message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={isSending}
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/160 characters. Compliance footer will be added automatically.
            </p>
          </div>

          {lastResult && (
            <div className={`rounded-md p-3 text-sm flex items-start gap-2 ${
              lastResult.success 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {lastResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Message sent successfully!</p>
                    <p className="text-xs mt-1">
                      Message ID: {lastResult.data.message_id}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to send</p>
                    <p className="text-xs mt-1">{lastResult.error}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSending || !phoneNumber || !message}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test SMS
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
