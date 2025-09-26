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
    showRatingLabels: true
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
      
      // Get user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        return;
      }

      // Load form settings from database (if they exist)
      const { data: settings } = await supabase
        .from('feedback_form_settings')
        .select('*')
        .eq('business_id', profile.business_id)
        .single();

      if (settings) {
        setFormSettings({
          ...formSettings,
          ...settings.settings
        });
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
      
      // Get user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) {
        return;
      }

      // Save form settings to database
      const { error } = await supabase
        .from('feedback_form_settings')
        .upsert({
          business_id: profile.business_id,
          settings: formSettings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      alert('Form settings saved successfully!');
    } catch (err) {
      console.error('Error saving form settings:', err);
      alert('Error saving form settings: ' + err.message);
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
              <Label htmlFor="showRatingLabels">Show rating labels (Poor, Fair, Good, Great, Excellent)</Label>
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
      </div>
    </div>
  );
}
