
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react"; // Added Loader2, Building2 already there
import { User, Business } from "@/api/entities";
import { motion } from "framer-motion"; // Added framer-motion

export default function OnboardingPage() { // Renamed from Onboarding
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    google_review_url: "",
    yelp_review_url: "",
    industry: "",
  });
  const [isSaving, setIsSaving] = useState(false); // Renamed from isSubmitting

  // Removed industries array and defaultTemplates as they are no longer used for UI auto-population
  // The select items are hardcoded in the new UI outline

  // Removed handleInputChange as direct setFormData is used for all fields
  // Removed handleLogoUpload as logo upload functionality is removed from this onboarding step

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true); // Using isSaving

    try {
      // User.me() call removed as email is now a required input and not derived from current user
      // Logo upload logic removed as per UI changes
      await Business.create({
        ...formData,
        // email is now directly from formData, no fallback needed
        // logo_url and other fields like review_delay_hours, email_template are removed from this initial setup
      });

      // Redirect to dashboard with a flag indicating onboarding is complete
      navigate(createPageUrl("Dashboard?onboard=success"));
    } catch (error) {
      console.error("Error creating business:", error);
      // Optionally add user-facing error message here
    } finally {
      setIsSaving(false); // Using isSaving
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          {/* New logo/icon area */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Blipp!</h1>
          <p className="text-gray-600">Let's set up your business profile to get started</p>
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


