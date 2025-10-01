import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';

export default function ProvisionNumberModal({ open, onClose, businessId, onProvisioned }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    legal_name: '',
    website: '',
    address: '',
    ein_or_sole_prop: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    opt_in_method: 'website',
    opt_in_evidence_url: '',
    terms_url: 'https://myblipp.com/terms',
    privacy_url: 'https://myblipp.com/privacy',
    estimated_monthly_volume: '',
    time_zone: 'America/New_York'
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Show confirmation warning
    const confirmed = window.confirm(
      '⚠️ IMPORTANT: Please verify all information is correct.\n\n' +
      'You can only submit this verification form ONCE. Make sure:\n' +
      '• Business name and contact info are accurate\n' +
      '• EIN or tax information is correct\n' +
      '• All details match your business records\n\n' +
      'Click OK to proceed with verification submission.'
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/surge/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessInfo: formData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to provision number');
      }

      console.log('[PROVISION] Success:', data);
      onProvisioned(data);
      onClose();

    } catch (err) {
      console.error('[PROVISION] Error:', err);
      setError(err.message || 'Failed to provision SMS number');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get Your Free SMS Number</DialogTitle>
          <DialogDescription>
            We'll provision a toll-free number and submit it for verification. This process typically takes 1-3 business days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="legal_name">Legal Business Name *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => handleChange('legal_name', e.target.value)}
                required
                placeholder="ABC Company LLC"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="ein_or_sole_prop">EIN or "Sole Prop"</Label>
              <Input
                id="ein_or_sole_prop"
                value={formData.ein_or_sole_prop}
                onChange={(e) => handleChange('ein_or_sole_prop', e.target.value)}
                placeholder="12-3456789 or Sole Prop"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div>
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="+14155551234"
              />
            </div>

            <div>
              <Label htmlFor="opt_in_method">Opt-In Method</Label>
              <Select
                value={formData.opt_in_method}
                onValueChange={(value) => handleChange('opt_in_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website Form</SelectItem>
                  <SelectItem value="verbal">Verbal Consent</SelectItem>
                  <SelectItem value="written">Written Agreement</SelectItem>
                  <SelectItem value="paper">Paper Form</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="opt_in_evidence_url">Opt-In Evidence URL *</Label>
              <Input
                id="opt_in_evidence_url"
                type="url"
                value={formData.opt_in_evidence_url}
                onChange={(e) => handleChange('opt_in_evidence_url', e.target.value)}
                required
                placeholder="https://example.com/opt-in-form"
              />
              <p className="text-xs text-gray-500 mt-1">URL to your opt-in form or evidence</p>
            </div>

            <div>
              <Label htmlFor="estimated_monthly_volume">Estimated Monthly Volume *</Label>
              <Select
                value={formData.estimated_monthly_volume}
                onValueChange={(value) => handleChange('estimated_monthly_volume', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (0-1,000 messages)</SelectItem>
                  <SelectItem value="medium">Medium (1,000-10,000 messages)</SelectItem>
                  <SelectItem value="high">High (10,000+ messages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time_zone">Time Zone</Label>
              <Select
                value={formData.time_zone}
                onValueChange={(value) => handleChange('time_zone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="terms_url">Terms URL (Required by Surge)</Label>
              <Input
                id="terms_url"
                type="url"
                value={formData.terms_url}
                disabled
                className="bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Platform-level terms (required for verification)</p>
            </div>

            <div className="col-span-2">
              <Label htmlFor="privacy_url">Privacy Policy URL (Required by Surge)</Label>
              <Input
                id="privacy_url"
                type="url"
                value={formData.privacy_url}
                disabled
                className="bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Platform-level privacy policy (required for verification)</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-gray-700">
            <strong>Note:</strong> After submission, your toll-free number will be pending verification. 
            This typically takes 1-3 business days. You'll be able to send SMS once approved.
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Get SMS Number'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
