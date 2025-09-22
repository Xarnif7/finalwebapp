
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
    website: "",
    description: "",
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
            website: business.website || "",
            description: business.description || "",
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
            website: formData.website,
            description: formData.description,
          })
          .eq('id', existingBusinesses[0].id);
        
        if (updateError) throw updateError;
        businessId = existingBusinesses[0].id;
        console.log('[ONBOARDING] Updated existing business:', businessId);
      } else {
        // Create new business - try with created_by field as fallback
        const businessData = {
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          google_review_url: formData.google_review_url,
          yelp_review_url: formData.yelp_review_url,
          industry: formData.industry,
          website: formData.website,
          description: formData.description,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-4xl"
      >
        {/* Success Message for Users Who Just Paid */}
        {justPaid && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-green-800">
                  Payment Successful! 🎉
                </h3>
                <p className="text-green-700 mt-1">
                  Your subscription is now active. Let's set up your business profile to get started with automations and review management.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Building2 className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {justPaid ? 'Welcome to Blipp! 🚀' : 'Complete Your Business Setup'}
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {justPaid 
              ? 'Let\'s get your business profile set up so you can start managing your online reputation and automating review requests.'
              : 'Please provide your business information to complete the setup process and personalize your experience.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Business Information Section */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm font-bold">1</span>
              </div>
              Business Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Business Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., ABC Plumbing Services"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-sm font-medium text-slate-700">
                  Industry *
                </Label>
                <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                  <SelectTrigger className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home-services">Home Services (Plumbing, HVAC, etc.)</SelectItem>
                    <SelectItem value="healthcare">Healthcare & Medical</SelectItem>
                    <SelectItem value="restaurant">Restaurant & Food Service</SelectItem>
                    <SelectItem value="retail">Retail & E-commerce</SelectItem>
                    <SelectItem value="professional-services">Professional Services</SelectItem>
                    <SelectItem value="automotive">Automotive Services</SelectItem>
                    <SelectItem value="beauty-wellness">Beauty & Wellness</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                Business Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Briefly describe what your business does..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[80px]"
                rows={3}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm font-bold">2</span>
              </div>
              Contact Information
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-slate-700">
                  Business Address
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Main St, City, State 12345"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Business Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="business@example.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium text-slate-700">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://www.yourbusiness.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Review URLs Section */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 text-sm font-bold">3</span>
              </div>
              Review Platform URLs
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Add your review page URLs to help customers leave reviews after service completion. You can add these later in Settings if you don't have them ready.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google_review_url" className="text-sm font-medium text-slate-700">
                  Google Review URL
                </Label>
                <Input
                  id="google_review_url"
                  type="url"
                  value={formData.google_review_url}
                  onChange={(e) => setFormData({...formData, google_review_url: e.target.value})}
                  placeholder="https://g.page/r/your-business/review"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Find this by searching your business on Google and clicking "Write a review"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yelp_review_url" className="text-sm font-medium text-slate-700">
                  Yelp Review URL
                </Label>
                <Input
                  id="yelp_review_url"
                  type="url"
                  value={formData.yelp_review_url}
                  onChange={(e) => setFormData({...formData, yelp_review_url: e.target.value})}
                  placeholder="https://www.yelp.com/biz/your-business"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Find this by searching your business on Yelp and copying the business page URL
                </p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center pt-4"
          >
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up your business...
                </>
              ) : (
                "Complete Setup & Go to Dashboard"
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}


