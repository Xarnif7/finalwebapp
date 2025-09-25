import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';

const SmartAlerts = ({ businessId }) => {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [negativeThreshold, setNegativeThreshold] = useState(2); // 1-2 star reviews
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    // Load alert settings from database
    loadAlertSettings();
    loadRecentAlerts();
  }, [businessId]);

  const loadAlertSettings = async () => {
    try {
      const response = await fetch('/api/reviews/alert-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlertsEnabled(data.enabled || false);
        setEmailAlerts(data.email_enabled || false);
        setPushAlerts(data.push_enabled || false);
        setNegativeThreshold(data.negative_threshold || 2);
      }
    } catch (error) {
      console.error('Error loading alert settings:', error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
      const response = await fetch(`/api/reviews/recent-alerts?business_id=${businessId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error loading recent alerts:', error);
    }
  };

  const saveAlertSettings = async () => {
    try {
      const response = await fetch('/api/reviews/alert-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          enabled: alertsEnabled,
          email_enabled: emailAlerts,
          push_enabled: pushAlerts,
          negative_threshold: negativeThreshold
        }),
      });
      
      if (response.ok) {
        alert('Alert settings saved successfully!');
      } else {
        alert('Failed to save alert settings');
      }
    } catch (error) {
      console.error('Error saving alert settings:', error);
      alert('Failed to save alert settings');
    }
  };

  const testAlert = async () => {
    try {
      const response = await fetch('/api/reviews/test-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          type: 'negative_review'
        }),
      });
      
      if (response.ok) {
        alert('Test alert sent! Check your email.');
      } else {
        alert('Failed to send test alert');
      }
    } catch (error) {
      console.error('Error sending test alert:', error);
      alert('Failed to send test alert');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Smart Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Smart Alerts</h4>
              <p className="text-sm text-gray-600">Get notified when negative reviews arrive</p>
            </div>
            <Switch
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
            />
          </div>

          {alertsEnabled && (
            <>
              {/* Alert Types */}
              <div className="space-y-4">
                <h4 className="font-medium">Alert Types</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>Email Notifications</span>
                  </div>
                  <Switch
                    checked={emailAlerts}
                    onCheckedChange={setEmailAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    <span>Push Notifications</span>
                  </div>
                  <Switch
                    checked={pushAlerts}
                    onCheckedChange={setPushAlerts}
                  />
                </div>
              </div>

              {/* Negative Review Threshold */}
              <div className="space-y-2">
                <h4 className="font-medium">Negative Review Threshold</h4>
                <p className="text-sm text-gray-600">Get alerts for reviews with this rating or lower</p>
                <select
                  value={negativeThreshold}
                  onChange={(e) => setNegativeThreshold(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>1 Star (Very Bad)</option>
                  <option value={2}>2 Stars (Bad)</option>
                  <option value={3}>3 Stars (Neutral)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={saveAlertSettings}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
                <Button variant="outline" onClick={testAlert}>
                  <Bell className="h-4 w-4 mr-2" />
                  Test Alert
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium">Negative Review Alert</p>
                      <p className="text-sm text-gray-600">
                        {alert.reviewer_name} left a {alert.rating}-star review
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {alert.rating} Stars
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAlerts;
