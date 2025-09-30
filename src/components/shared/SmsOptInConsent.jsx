import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Info, Shield, MessageSquare, Clock, DollarSign, X } from 'lucide-react';

const SmsOptInConsent = ({ 
  businessName = "Blipp - Reputation Management Software", 
  onConsentChange, 
  initialConsent = false,
  showFullForm = true,
  className = ""
}) => {
  const [smsConsent, setSmsConsent] = useState(initialConsent);
  const [showDetails, setShowDetails] = useState(false);

  const handleConsentChange = (checked) => {
    setSmsConsent(checked);
    onConsentChange?.(checked);
  };

  const consentText = `By submitting, you authorize ${businessName} to text the number you provided with offers & other information, possibly using automated means. Message/data rates apply. Message frequency varies. Text HELP for help or STOP to opt out. Consent is not a condition of purchase. See privacy policy.`;

  if (!showFullForm) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-start space-x-3">
          <Checkbox
            id="sms-consent"
            checked={smsConsent}
            onCheckedChange={handleConsentChange}
            className="mt-1"
          />
          <div className="space-y-2">
            <Label htmlFor="sms-consent" className="text-sm font-medium cursor-pointer">
              SMS Communications Consent
            </Label>
            <p className="text-xs text-gray-600 leading-relaxed">
              {consentText}
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto text-blue-600 hover:text-blue-700"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
        </div>

        {showDetails && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span><strong>Data Protection:</strong> Your SMS opt-in data will not be shared with third parties.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span><strong>Message Types:</strong> Service updates, appointment reminders, and promotional offers.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span><strong>Frequency:</strong> Varies based on your service needs (typically 1-4 messages per month).</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span><strong>Costs:</strong> Standard message and data rates may apply per your carrier.</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">SMS Communications Consent</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="sms-consent-full"
            checked={smsConsent}
            onCheckedChange={handleConsentChange}
            className="mt-1"
          />
          <div className="space-y-2">
            <Label htmlFor="sms-consent-full" className="text-sm font-medium cursor-pointer">
              I consent to receive SMS messages from {businessName}
            </Label>
            <p className="text-sm text-gray-600 leading-relaxed">
              {consentText}
            </p>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Data Protection:</strong> All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Message Purpose:</strong> We send SMS messages for service updates, appointment reminders, review requests, and promotional offers related to your business relationship with us.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Message Frequency:</strong> Message frequency varies based on your service needs. Typically, you'll receive 1-4 messages per month, but this may increase during active service periods.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <DollarSign className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Message and Data Rates:</strong> Standard message and data rates may apply per your mobile carrier. Check with your carrier for details about your messaging plan.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Opt-Out Method:</strong> You can opt out at any time by replying STOP to any message, or by contacting us directly. You can also reply HELP for assistance.
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Privacy Policy:</strong> For more information about how we handle your data, please review our{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
              Privacy Policy
            </a>.
          </p>
          <p>
            <strong>Business Information:</strong> {businessName} - Reputation Management Software
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmsOptInConsent;
