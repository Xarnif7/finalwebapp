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
    brand_name: '',
    website: '',
    street_line1: '',
    street_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    ein: '',
    sole_prop: false,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    opt_in_method: 'website',
    opt_in_evidence_url: '',
    terms_url: '',
    privacy_url: '',
    estimated_monthly_volume: '',
    time_zone_iana: 'America/Denver'
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Phone normalization helper
  const normalizePhone = (phone) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 1 and has 11 digits, it's already E.164 format
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it has 10 digits, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it already starts with +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    return phone;
  };

  // E.164 validation
  const isValidE164 = (phone) => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  // EIN validation (9 digits)
  const isValidEIN = (ein) => {
    const digits = ein.replace(/\D/g, '');
    return digits.length === 9;
  };

  // URL validation
  const isValidURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const errors = [];
    
    // Required fields
    if (!formData.legal_name) errors.push('Legal Business Name is required');
    if (!formData.street_line1) errors.push('Street Address is required');
    if (!formData.city) errors.push('City is required');
    if (!formData.state) errors.push('State is required');
    if (!formData.postal_code) errors.push('Postal Code is required');
    if (!formData.contact_name) errors.push('Contact Name is required');
    if (!formData.contact_email) errors.push('Contact Email is required');
    if (!formData.opt_in_evidence_url) errors.push('Opt-In Evidence URL is required');
    if (!formData.terms_url) errors.push('Terms URL is required');
    if (!formData.privacy_url) errors.push('Privacy URL is required');
    if (!formData.estimated_monthly_volume) errors.push('Estimated Monthly Volume is required');
    
    // EIN validation
    if (!formData.sole_prop && formData.ein && !isValidEIN(formData.ein)) {
      errors.push('EIN must be exactly 9 digits');
    }
    
    // Phone validation
    if (formData.contact_phone) {
      const normalizedPhone = normalizePhone(formData.contact_phone);
      if (!isValidE164(normalizedPhone)) {
        errors.push('Contact Phone must be a valid phone number');
      }
    }
    
    // URL validation
    if (formData.opt_in_evidence_url && !isValidURL(formData.opt_in_evidence_url)) {
      errors.push('Opt-In Evidence URL must be a valid URL');
    }
    if (formData.terms_url && !isValidURL(formData.terms_url)) {
      errors.push('Terms URL must be a valid URL');
    }
    if (formData.privacy_url && !isValidURL(formData.privacy_url)) {
      errors.push('Privacy URL must be a valid URL');
    }
    if (formData.website && !isValidURL(formData.website)) {
      errors.push('Website must be a valid URL');
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }
    
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
      // Normalize phone number
      const contact_phone_e164 = formData.contact_phone ? normalizePhone(formData.contact_phone) : '';
      
      // Build payload
      const payload = {
        businessId,
        businessInfo: {
          legal_name: formData.legal_name,
          brand_name: formData.brand_name || formData.legal_name,
          website: formData.website,
          address: {
            street_line1: formData.street_line1,
            street_line2: formData.street_line2,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country
          },
          ein: formData.sole_prop ? null : formData.ein,
          sole_prop: formData.sole_prop,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone_e164: contact_phone_e164,
          opt_in_method: formData.opt_in_method,
          opt_in_evidence_url: formData.opt_in_evidence_url,
          terms_url: formData.terms_url,
          privacy_url: formData.privacy_url,
          estimated_monthly_volume: parseInt(formData.estimated_monthly_volume),
          time_zone_iana: formData.time_zone_iana
        }
      };

      const response = await fetch('/api/surge/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

            <div className="col-span-2">
              <Label htmlFor="brand_name">Brand / DBA (Optional)</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) => handleChange('brand_name', e.target.value)}
                placeholder="Your Brand Name (leave blank to use legal name)"
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
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleChange('country', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="street_line1">Street Address *</Label>
              <Input
                id="street_line1"
                value={formData.street_line1}
                onChange={(e) => handleChange('street_line1', e.target.value)}
                required
                placeholder="123 Main Street"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="street_line2">Street Address Line 2 (Optional)</Label>
              <Input
                id="street_line2"
                value={formData.street_line2}
                onChange={(e) => handleChange('street_line2', e.target.value)}
                placeholder="Suite 100, Floor 2, etc."
              />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
                placeholder="New York"
              />
            </div>

            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
                placeholder="NY"
              />
            </div>

            <div>
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                required
                placeholder="10001"
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sole_prop"
                  checked={formData.sole_prop}
                  onChange={(e) => handleChange('sole_prop', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sole_prop">Sole proprietor (no EIN)</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="ein">EIN *</Label>
              <Input
                id="ein"
                value={formData.ein}
                onChange={(e) => handleChange('ein', e.target.value)}
                disabled={formData.sole_prop}
                placeholder="123456789"
                maxLength="9"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.sole_prop ? 'Disabled for sole proprietors' : '9 digits only'}
              </p>
            </div>

            <div>
              <Label htmlFor="time_zone_iana">Time Zone *</Label>
              <Select
                value={formData.time_zone_iana}
                onValueChange={(value) => handleChange('time_zone_iana', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">America/New_York (Eastern)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (Central)</SelectItem>
                  <SelectItem value="America/Denver">America/Denver (Mountain)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (Pacific)</SelectItem>
                </SelectContent>
              </Select>
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
                placeholder="+14155551234 or (415) 555-1234"
              />
            </div>

            <div>
              <Label htmlFor="opt_in_method">Opt-In Method *</Label>
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

            <div className="col-span-2">
              <Label htmlFor="opt_in_evidence_url">Opt-In Evidence URL *</Label>
              <Input
                id="opt_in_evidence_url"
                type="url"
                value={formData.opt_in_evidence_url}
                onChange={(e) => handleChange('opt_in_evidence_url', e.target.value)}
                required
                placeholder="https://example.com/opt-in-form"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to your opt-in form or evidence. Must show your brand and STOP/HELP line.
              </p>
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
                  <SelectItem value="100">100 messages</SelectItem>
                  <SelectItem value="300">300 messages</SelectItem>
                  <SelectItem value="1000">1,000 messages</SelectItem>
                  <SelectItem value="3000">3,000 messages</SelectItem>
                  <SelectItem value="10000">10,000 messages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="terms_url">Terms URL *</Label>
              <Input
                id="terms_url"
                type="url"
                value={formData.terms_url}
                onChange={(e) => handleChange('terms_url', e.target.value)}
                required
                placeholder="https://example.com/terms"
              />
              <p className="text-xs text-gray-500 mt-1">Your business terms of service</p>
            </div>

            <div>
              <Label htmlFor="privacy_url">Privacy Policy URL *</Label>
              <Input
                id="privacy_url"
                type="url"
                value={formData.privacy_url}
                onChange={(e) => handleChange('privacy_url', e.target.value)}
                required
                placeholder="https://example.com/privacy"
              />
              <p className="text-xs text-gray-500 mt-1">Your business privacy policy</p>
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
