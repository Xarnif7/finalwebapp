
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react"; // Added Loader2, Building2 already there

import { motion } from "framer-motion"; // Added framer-motion
import { supabase } from "../lib/supabase/browser";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    google_review_url: "",
    yelp_review_url: "",
    industry: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justPaid, setJustPaid] = useState(false);

  // First render log and subscription check
  useEffect(() => {
    const justPaidFlag = sessionStorage.getItem('justPaid') === '1';
    setJustPaid(justPaidFlag);
    console.log('[ONBOARDING] First render:', { 
      route: '/onboarding', 
      userId: user?.id,
      justPaid: justPaidFlag
    });
  }, [user]);

  // Fetch existing business data or create default profile
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log('[ONBOARDING] Fetching business data for user:', user.id);
        
        // Check if user has a profile - RLS will automatically filter by auth.uid()
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, onboarding_completed, stripe_customer_id')
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[ONBOARDING] Profile error:', profileError);
        }
        
        // Check if user has existing business - RLS will automatically filter by auth.uid()
        const { data: businesses, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .limit(1);
        
        if (businessError) {
          console.error('[ONBOARDING] Business fetch error:', businessError);
          console.error('[ONBOARDING] Business fetch error details:', {
            message: businessError.message,
            code: businessError.code,
            details: businessError.details,
            hint: businessError.hint
          });
        }
        
        // If business exists, populate form
        if (businesses && businesses.length > 0) {
          const business = businesses[0];
          setFormData({
            name: business.name || "",
            address: business.address || "",
            phone: business.phone || "",
            email: business.email || user.email || "",
            google_review_url: business.google_review_url || "",
            yelp_review_url: business.yelp_review_url || "",
            industry: business.industry || "",
          });
        } else {
          // Set default email from user
          setFormData(prev => ({
            ...prev,
            email: user.email || ""
          }));
        }
        
        console.log('[ONBOARDING] Data loaded:', { 
          hasProfile: !!profile, 
          loadingStates: { profile: !profile }
        });
        
      } catch (err) {
        console.error('[ONBOARDING] Error fetching data:', err);
        setError('Failed to load business data');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [user]);

  // Removed industries array and defaultTemplates as they are no longer used for UI auto-population
  // The select items are hardcoded in the new UI outline

  // Removed handleInputChange as direct setFormData is used for all fields
  // Removed handleLogoUpload as logo upload functionality is removed from this onboarding step

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      console.log('[ONBOARDING] Submitting form data:', formData);
      
      // Check if business already exists - RLS will automatically filter by auth.uid()
      const { data: existingBusinesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id')
        .limit(1);
      
      if (fetchError) {
        throw new Error('Failed to check existing business');
      }
      
      let businessId;
      
      if (existingBusinesses && existingBusinesses.length > 0) {
        // Update existing business
        const { error: updateError } = await supabase
          .from('businesses')
          .update({
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            email: formData.email,
            google_review_url: formData.google_review_url,
            yelp_review_url: formData.yelp_review_url,
            industry: formData.industry,
          })
          .eq('id', existingBusinesses[0].id);
        
        if (updateError) throw updateError;
        businessId = existingBusinesses[0].id;
        console.log('[ONBOARDING] Updated existing business:', businessId);
      } else {
        // Create new business - try with created_by field as fallback
        const businessData = {
          ...formData,
        };
        
        // If database trigger doesn't work, add created_by manually
        if (user.id) {
          businessData.created_by = user.id; // Use UUID, not email
        }
        
        console.log('[ONBOARDING] Creating business with data:', businessData);
        
        const { data: newBusiness, error: createError } = await supabase
          .from('businesses')
          .insert(businessData)
          .select('id')
          .single();
        
        if (createError) throw createError;
        businessId = newBusiness.id;
        console.log('[ONBOARDING] Created new business:', businessId);
      }

      // Update profile with business_id and onboarding_completed status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          business_id: businessId, // Link profile to the business
          onboarding_completed: true 
        })
        .eq('id', user.id);
      
      if (profileError) {
        console.error('[ONBOARDING] Error updating profile:', profileError);
      } else {
        console.log('[ONBOARDING] Profile updated with business_id:', businessId);
      }

      // Clear the justPaid flag
      sessionStorage.removeItem('justPaid');

      console.log('[ONBOARDING] Onboarding completed successfully, redirecting to dashboard');
      
      // Redirect to dashboard with replace: true
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error('[ONBOARDING] Error saving business:', error);
      console.error('[ONBOARDING] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      setError(`Failed to save business data: ${error.message}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return null; // No loading spinner to eliminate blue bar flash
  }

  // Always render the form even if there's an error - don't return null
  if (!user) {
    return null; // No loading spinner to eliminate blue bar flash
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl"
      >
        {/* Success Message for Users Who Just Paid */}
        {justPaid && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Payment Successful!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your subscription is now active. Let's set up your business profile to get started.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {justPaid ? 'Welcome to Blipp!' : 'Complete Your Business Setup'}
          </h1>
          <p className="text-gray-600">
            {justPaid 
              ? 'Let\'s get your business profile set up so you can start managing your online reputation.'
              : 'Please provide your business information to complete the setup process.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Your Business Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contact@yourbusiness.com"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="chiropractic">Chiropractic</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="123 Main Street, City, State, ZIP"
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Review Platform URLs (Optional)</h3>
            <p className="text-sm text-gray-600">Add these later in Settings if you don't have them ready</p>
            
            <div className="space-y-2">
              <Label htmlFor="google_review_url">Google Reviews URL</Label>
              <Input
                id="google_review_url"
                value={formData.google_review_url}
                onChange={(e) => setFormData({...formData, google_review_url: e.target.value})}
                placeholder="https://www.google.com/maps/place/..."
              />
              <p className="text-xs text-gray-500">Your Google Maps business page URL</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yelp_review_url">Yelp Business URL</Label>
              <Input
                id="yelp_review_url"
                value={formData.yelp_review_url}
                onChange={(e) => setFormData({...formData, yelp_review_url: e.target.value})}
                placeholder="https://www.yelp.com/biz/your-business-name"
              />
              <p className="text-xs text-gray-500">Your Yelp business page URL</p>
            </div>
          </div>

          {/* Logo Upload section removed */}
          {/* Review Timing section removed */}
          {/* Email Template section removed */}

          <Button
            type="submit"
            disabled={isSaving} // Using isSaving
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 text-lg font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting up your business...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5 mr-2" />
                Complete Setup
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}


