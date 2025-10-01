import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MessageSquare, Phone, AlertCircle, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { useDashboard } from '../providers/DashboardProvider';
import ProvisionNumberModal from '../sms/ProvisionNumberModal';
import TestSend from '../sms/TestSend';
import { formatPhoneDisplay } from '../../lib/phone';

const StatusBadge = ({ status }) => {
  const config = {
    not_provisioned: { 
      icon: Phone, 
      label: 'No SMS Number', 
      variant: 'secondary',
      className: 'bg-gray-100 text-gray-700'
    },
    pending: { 
      icon: Clock, 
      label: 'Pending Verification', 
      variant: 'warning',
      className: 'bg-yellow-100 text-yellow-700'
    },
    active: { 
      icon: CheckCircle2, 
      label: 'Active', 
      variant: 'success',
      className: 'bg-green-100 text-green-700'
    },
    action_needed: { 
      icon: AlertCircle, 
      label: 'Action Needed', 
      variant: 'destructive',
      className: 'bg-red-100 text-red-700'
    },
    disabled: { 
      icon: XCircle, 
      label: 'Disabled', 
      variant: 'destructive',
      className: 'bg-red-100 text-red-700'
    }
  };

  const { icon: Icon, label, className } = config[status] || config.not_provisioned;

  return (
    <Badge className={`flex items-center gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export default function MessagingSettings() {
  const { business } = useDashboard();
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (business?.id) {
      loadSmsStatus();
      
      // Poll for status updates every 30 seconds while on this page
      const interval = setInterval(() => {
        loadSmsStatus(true); // Silent poll
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [business?.id]);

  const loadSmsStatus = async (silent = false) => {
    if (!business?.id) return;

    try {
      if (!silent) {
        setLoading(true);
      } else {
        setPolling(true);
      }

      const response = await fetch(`/api/surge/status?businessId=${business.id}`);
      const data = await response.json();

      if (response.ok) {
        setSmsStatus(data);
      }
    } catch (error) {
      console.error('[MESSAGING] Error loading SMS status:', error);
    } finally {
      setLoading(false);
      setPolling(false);
    }
  };

  const handleProvisioned = (data) => {
    console.log('[MESSAGING] Number provisioned:', data);
    loadSmsStatus(); // Refresh status
  };

  if (!business) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Loading business information...</p>
        </CardContent>
      </Card>
    );
  }

  const hasNumber = smsStatus?.from_number;
  const status = smsStatus?.status || 'not_provisioned';
  const isActive = status === 'active';

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Messaging
              </CardTitle>
              <CardDescription>
                Manage your toll-free SMS number and verification status
              </CardDescription>
            </div>
            {polling && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading SMS status...
            </div>
          ) : (
            <>
              {hasNumber ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Your SMS Number</p>
                      <p className="text-lg font-semibold">{formatPhoneDisplay(smsStatus.from_number)}</p>
                      <p className="text-xs text-gray-500 mt-1">Toll-Free Number</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-900">Verification Pending</p>
                          <p className="text-yellow-800 mt-1">
                            Your toll-free number is being verified. This typically takes 1-3 business days.
                            We'll notify you once it's approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'action_needed' && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900">Action Required</p>
                          {smsStatus.last_error && (
                            <p className="text-red-800 mt-1">{smsStatus.last_error}</p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setShowProvisionModal(true)}
                          >
                            Fix & Resubmit
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'disabled' && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900">SMS Disabled</p>
                          <p className="text-red-800 mt-1">
                            SMS sending has been disabled for this number. Please contact support.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-900">SMS is Active!</p>
                          <p className="text-green-800 mt-1">
                            Your toll-free number is verified and ready to send SMS messages.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No SMS Number Yet</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Get a free toll-free SMS number to start sending text messages to your customers.
                      The verification process typically takes 1-3 business days.
                    </p>
                    <Button
                      onClick={() => setShowProvisionModal(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Get a Free SMS Number
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                    <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
                    <ul className="text-blue-800 space-y-1">
                      <li>• We'll provision a toll-free number for your business</li>
                      <li>• Submit verification with your business details</li>
                      <li>• Approval typically takes 1-3 business days</li>
                      <li>• Once approved, start sending SMS to customers</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Test Send (only show when active) */}
      {isActive && hasNumber && (
        <TestSend businessId={business.id} fromNumber={smsStatus.from_number} />
      )}

      {/* Provision Modal */}
      <ProvisionNumberModal
        open={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        businessId={business.id}
        onProvisioned={handleProvisioned}
      />
    </div>
  );
}
