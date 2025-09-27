import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/browser';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { MessageSquare, Star, Save, Eye } from 'lucide-react';

export default function FeedbackFormSetup() {
  const [formSettings, setFormSettings] = useState({
    title: 'How was your experience?',
    subtitle: '',
    commentPlaceholder: 'What made your experience great? Or how could we improve?',
    submitButtonText: 'Submit Feedback',
    successMessagePositive: 'Thanks for your feedback! Would you also share it publicly?',
    successMessageNegative: 'Thanks for your feedback! Our team will review this privately and work to improve your experience.',
    showCommentField: true,
    showRatingLabels: true,
    email_subject: 'Thanks for choosing our business!',
    email_header: 'Thank You',
    email_subheader: 'We appreciate your business',
    email_message: 'We hope you had a great experience with us! Your feedback is incredibly valuable and helps us continue to provide excellent service.',
    email_button_text: 'Leave Feedback'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadFormSettings();
  }, []);

  const loadFormSettings = async () => {
    try {
      setLoading(true);
      // Get user's business_id to read settings (or later provide via GET with business_id)
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', session?.user?.id)
        .single();
      if (!profile?.business_id) { 
        console.log('🔍 No business_id found for user');
        setLoading(false); 
        return; 
      }
      console.log('🔍 Loading form settings for business_id:', profile.business_id);
      const resp = await fetch(`/api/feedback-form-settings?business_id=${profile.business_id}`);
      const result = await resp.json();
      console.log('🔍 Form settings API response:', result);
      if (result?.settings) {
        console.log('✅ Loaded form settings:', result.settings);
        setFormSettings(result.settings);
      } else {
        console.log('⚠️ No settings found in API response');
      }
    } catch (err) {
      console.error('Error loading form settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveFormSettings = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving form settings:', formSettings);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }
      
      console.log('💾 Session token available:', session.access_token.substring(0, 20) + '...');
      
      const resp = await fetch('/api/feedback-form-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ settings: formSettings })
      });
      
      console.log('💾 Response status:', resp.status);
      const result = await resp.json();
      console.log('💾 Save response:', result);
      
      if (!resp.ok) {
        throw new Error(result.error || `HTTP ${resp.status}: Failed to save form settings`);
      }
      
      alert('Form settings saved successfully!');
    } catch (err) {
      console.error('Error saving form settings:', err);
      alert('Error saving form settings: ' + (err.message || err.error || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderPreview = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl">{formSettings.title}</CardTitle>
            {formSettings.subtitle && (
              <p className="text-gray-600 text-sm">{formSettings.subtitle}</p>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Star Rating */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="w-12 h-12 mx-1 text-gray-300" />
                  ))}
                </div>
                {formSettings.showRatingLabels && (
                  <p className="text-sm text-gray-600">Rate your experience</p>
                )}
              </div>

              {/* Comment Field */}
              {formSettings.showCommentField && (
                <div>
                  <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us more about your experience (optional)
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder={formSettings.commentPlaceholder}
                    rows={3}
                    className="resize-none"
                    disabled
                  />
                </div>
              )}

              <Button className="w-full" disabled>
                {formSettings.submitButtonText}
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500 mt-4">
              <p>Your feedback helps us improve our service.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">Loading form settings...</p>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Form Preview</h2>
          <Button onClick={() => setPreviewMode(false)} variant="outline">
            Back to Settings
          </Button>
        </div>
        {renderPreview()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feedback Form Setup</h2>
          <p className="text-gray-600">Customize your feedback collection form</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPreviewMode(true)} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveFormSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Form Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Form Title</Label>
              <Input
                id="title"
                value={formSettings.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="How was your experience?"
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle (Optional)</Label>
              <Input
                id="subtitle"
                value={formSettings.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="Your business name or additional context"
              />
            </div>

            <div>
              <Label htmlFor="submitButtonText">Submit Button Text</Label>
              <Input
                id="submitButtonText"
                value={formSettings.submitButtonText}
                onChange={(e) => handleInputChange('submitButtonText', e.target.value)}
                placeholder="Submit Feedback"
              />
            </div>
          </CardContent>
        </Card>

        {/* Comment Field Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Comment Field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="showCommentField"
                checked={formSettings.showCommentField}
                onCheckedChange={(checked) => handleInputChange('showCommentField', checked)}
              />
              <Label htmlFor="showCommentField">Show comment field</Label>
            </div>

            {formSettings.showCommentField && (
              <div>
                <Label htmlFor="commentPlaceholder">Comment Placeholder</Label>
                <Textarea
                  id="commentPlaceholder"
                  value={formSettings.commentPlaceholder}
                  onChange={(e) => handleInputChange('commentPlaceholder', e.target.value)}
                  placeholder="What made your experience great? Or how could we improve?"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="showRatingLabels"
                checked={formSettings.showRatingLabels}
                onCheckedChange={(checked) => handleInputChange('showRatingLabels', checked)}
              />
              <Label htmlFor="showRatingLabels">Show rating labels based on number of stars selected</Label>
            </div>
          </CardContent>
        </Card>

        {/* Success Messages */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Success Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="successMessagePositive">Positive Feedback Message (4-5 stars)</Label>
              <Textarea
                id="successMessagePositive"
                value={formSettings.successMessagePositive}
                onChange={(e) => handleInputChange('successMessagePositive', e.target.value)}
                placeholder="Thanks for your feedback! Would you also share it publicly?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="successMessageNegative">Negative Feedback Message (1-3 stars)</Label>
              <Textarea
                id="successMessageNegative"
                value={formSettings.successMessageNegative}
                onChange={(e) => handleInputChange('successMessageNegative', e.target.value)}
                placeholder="Thanks for your feedback! Our team will review this privately and work to improve your experience."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Template Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Email Template Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email_subject">Email Subject</Label>
              <Input
                id="email_subject"
                value={formSettings.email_subject}
                onChange={(e) => handleInputChange('email_subject', e.target.value)}
                placeholder="Thanks for choosing our business!"
              />
            </div>

            <div>
              <Label htmlFor="email_header">Email Header</Label>
              <Input
                id="email_header"
                value={formSettings.email_header}
                onChange={(e) => handleInputChange('email_header', e.target.value)}
                placeholder="Thank You"
              />
            </div>

            <div>
              <Label htmlFor="email_subheader">Email Subheader</Label>
              <Input
                id="email_subheader"
                value={formSettings.email_subheader}
                onChange={(e) => handleInputChange('email_subheader', e.target.value)}
                placeholder="We appreciate your business"
              />
            </div>

            <div>
              <Label htmlFor="email_message">Email Message</Label>
              <Textarea
                id="email_message"
                value={formSettings.email_message}
                onChange={(e) => handleInputChange('email_message', e.target.value)}
                placeholder="We hope you had a great experience with us! Your feedback is incredibly valuable and helps us continue to provide excellent service."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="email_button_text">Email Button Text</Label>
              <Input
                id="email_button_text"
                value={formSettings.email_button_text}
                onChange={(e) => handleInputChange('email_button_text', e.target.value)}
                placeholder="Leave Feedback"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
