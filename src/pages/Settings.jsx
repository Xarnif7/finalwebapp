import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { supabase } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/use-toast";

const SettingsTab = ({ children, title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md ${
      isActive
        ? "bg-slate-100 text-slate-900"
        : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    {title}
  </button>
);

const ProfileSettings = () => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            // Load profile data from database
            loadProfile();
        }
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        
        try {
            // Try to load from database first
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.warn('Error loading profile from database:', error);
            }

            // Set the full name from database, fallback to user metadata
            const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "";
            setFullName(name);
            
            console.log('Loaded profile:', { 
                fromDatabase: profile?.full_name, 
                fromMetadata: user.user_metadata?.full_name || user.user_metadata?.name,
                final: name 
            });
        } catch (error) {
            console.warn('Error loading profile:', error);
            // Fallback to user metadata only
            const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
            setFullName(name);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            console.log('Saving profile with name:', fullName);
            
            // First, try to update user metadata (this always works)
            const { error: authError } = await supabase.auth.updateUser({
                data: { 
                    full_name: fullName,
                    name: fullName 
                }
            });

            if (authError) {
                console.error('Auth update error:', authError);
                throw authError;
            }

            console.log('Auth metadata updated successfully');

            // Try to update profile in database (may fail if column doesn't exist yet)
            try {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        full_name: fullName,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    });

                if (profileError) {
                    console.warn("Profile database update failed (column may not exist yet):", profileError);
                } else {
                    console.log('Database profile updated successfully');
                }
            } catch (dbError) {
                console.warn("Database update failed:", dbError);
                // Continue anyway since user metadata was updated
            }

            toast({
                title: "Success",
                description: "Profile updated successfully!",
            });
            
            // Force a page reload to ensure the user metadata is properly loaded
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your personal information.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                        id="name" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ""} 
                        disabled 
                        className="bg-gray-50"
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Profile"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const BusinessSettings = () => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const [businessName, setBusinessName] = useState("");
    const [website, setWebsite] = useState("");
    const [googleReviewUrl, setGoogleReviewUrl] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            loadBusiness();
        }
    }, [user]);

    const loadBusiness = async () => {
        try {
            setLoading(true);
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('user_id', user.id)
                .single();

            const businessId = profile?.business_id;
            if (!businessId) return;

            const { data: biz } = await supabase
                .from('businesses')
                .select('id, name, website, google_review_url')
                .eq('id', businessId)
                .maybeSingle();

            if (biz) {
                setBusinessName(biz.name || "");
                setWebsite(biz.website || "");
                setGoogleReviewUrl(biz.google_review_url || "");
            }
        } catch (e) {
            console.warn('Error loading business', e);
        } finally {
            setLoading(false);
        }
    };

    const saveBusiness = async () => {
        try {
            setLoading(true);
            console.log('Saving business:', { name: businessName, website, googleReviewUrl });
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch('/api/business/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({ name: businessName, website, google_review_url: googleReviewUrl })
            });
            const result = await resp.json();
            console.log('Save response:', result);
            if (!resp.ok) throw (result || { error: 'Failed to save' });
            toast({ title: 'Saved', description: 'Business details updated.' });
            // Reload business data after saving
            loadBusiness();
        } catch (e) {
            console.error('Save business error', e);
            toast({ title: 'Error', description: e.message || e.error || 'Failed to save', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Manage your main business details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Enter your business name as you want it to appear in review request forms" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="website">Company Website</Label>
                    <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="googleReviewUrl">Google Review URL</Label>
                    <Input 
                        id="googleReviewUrl" 
                        value={googleReviewUrl} 
                        onChange={(e) => setGoogleReviewUrl(e.target.value)} 
                        placeholder="https://www.google.com/maps/place/your-business" 
                    />
                    <p className="text-xs text-gray-500">Direct link to your Google Maps review page. This will be used when customers click "Leave a Google Review".</p>
                </div>
                <div className="flex justify-end">
                    <Button onClick={saveBusiness} disabled={loading}>{loading ? 'Saving...' : 'Save Business Info'}</Button>
                </div>
            </CardContent>
        </Card>
    );
};

const BillingSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [showCards, setShowCards] = useState(false);
  const [cards, setCards] = useState({ payment_methods: [], default_payment_method_id: null });
  const [hasStripeCustomer, setHasStripeCustomer] = useState(true); // Assume true initially
  const [planName, setPlanName] = useState('No subscription');
  const [searchParams] = useSearchParams();

  useEffect(() => { 
    load(); 
    
    // Auto-refresh if returning from portal
    const fromPortal = searchParams.get('from') === 'portal';
    if (fromPortal) {
      // Wait for webhook to process (webhooks can take 3-5 seconds), then reload
      console.log('[BILLING] Detected return from portal, will refresh in 5s...');
      setTimeout(() => {
        console.log('[BILLING] Refreshing subscription data after portal return...');
        load();
      }, 5000);
    }
  }, [searchParams]);

  const load = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setPlanName('No subscription');
        setHasStripeCustomer(false);
        setLoading(false);
        return;
      }
      
      // Fetch subscription status from our main endpoint (with cache-busting)
      const statusResp = await fetch('/api/subscription/status', {
        headers: { 
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      const statusData = await statusResp.json();
      
      console.log('[BILLING] Subscription status:', statusData);
      
      if (statusResp.ok && statusData.active) {
        let currentPlanTier = statusData.plan_tier;
        
        // Check if there's a scheduled upgrade (from Stripe subscription schedule)
        const stripeResp = await fetch('/api/stripe/subscription', {
          headers: { 
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        const stripeData = await stripeResp.json();
        
        // If there's a schedule with a future phase, check if it's an upgrade
        if (stripeData?.schedule?.phases && stripeData.schedule.phases.length > 1) {
          const currentPhase = stripeData.schedule.phases[0];
          const nextPhase = stripeData.schedule.phases[1];
          
          console.log('[BILLING] Found subscription schedule:', {
            currentPhase,
            nextPhase
          });
          
          // If next phase has a different (presumably higher) price, show that plan immediately
          if (nextPhase?.prices && nextPhase.prices.length > 0) {
            const nextPriceId = nextPhase.prices[0];
            
            // Map to tier
            if (nextPriceId === process.env.VITE_STRIPE_PRO_PRICE_ID || nextPriceId === 'price_1Rvn5oFr7CPBk7jl2CryiFFX') {
              currentPlanTier = 'pro';
              console.log('[BILLING] User has scheduled upgrade to Pro, showing Pro immediately');
            } else if (nextPriceId === process.env.VITE_STRIPE_ENTERPRISE_PRICE_ID || nextPriceId === 'price_1RvnATFr7CPBk7jlpYCYcU9q') {
              currentPlanTier = 'enterprise';
              console.log('[BILLING] User has scheduled upgrade to Enterprise, showing Enterprise immediately');
            } else if (nextPriceId === process.env.VITE_STRIPE_BASIC_PRICE_ID || nextPriceId === 'price_1Rull2Fr7CPBk7jlff5ak4uq') {
              currentPlanTier = 'basic';
              console.log('[BILLING] User has scheduled change to Basic');
            }
          }
        }
        
        // Map plan_tier to plan name
        let name = 'Active Subscription';
        
        if (currentPlanTier === 'basic' || currentPlanTier === 'standard') {
          name = 'Blipp Standard Plan';
        } else if (currentPlanTier === 'pro') {
          name = 'Blipp Pro Plan';
        } else if (currentPlanTier === 'enterprise') {
          name = 'Blipp Enterprise Plan';
        }
        
        setPlanName(name);
        setHasStripeCustomer(true);
        
        // Fetch subscription details from database to get current_period_end
        const { data: dbSub, error: dbError } = await supabase
          .from('subscriptions')
          .select('current_period_end, status, stripe_subscription_id')
          .eq('user_id', session.user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        console.log('[BILLING] DB subscription query:', { dbSub, dbError });
        console.log('[BILLING] Stripe subscription data (from earlier):', stripeData);
        
        // Use Stripe data as primary source, DB as fallback
        let periodEnd = null;
        let cancelAtPeriodEnd = false;
        
        if (stripeResp.ok && stripeData.subscription) {
          periodEnd = stripeData.subscription.current_period_end;
          cancelAtPeriodEnd = stripeData.subscription.cancel_at_period_end || false;
          console.log('[BILLING] Using Stripe data - period end:', periodEnd);
        } else if (!dbError && dbSub?.current_period_end) {
          periodEnd = new Date(dbSub.current_period_end).getTime();
          console.log('[BILLING] Using DB data - period end:', periodEnd);
        }
        
        setSub({
          status: statusData.status,
          cancel_at_period_end: cancelAtPeriodEnd,
          current_period_end: periodEnd
        });
        
        if (stripeData?.schedule) {
          setSchedule(stripeData.schedule);
        }
      } else {
        // No subscription found
        setPlanName('No subscription');
        setHasStripeCustomer(false);
        setSub(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setPlanName('No subscription');
      setHasStripeCustomer(false);
    } finally { 
      setLoading(false); 
    }
  };

  const openPortal = async () => {
    try {
      setLoading(true);
      console.log('Opening portal...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session?.access_token ? 'Token present' : 'No token');
      
      const resp = await fetch('/api/billing/portal', { 
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', resp.status);
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Failed to open portal' }));
        console.log('Error data:', errorData);
        
        // If no Stripe customer, show message to start subscription
        if (resp.status === 404 && errorData.error === 'No Stripe customer on account') {
          setHasStripeCustomer(false);
          toast({
            title: "No Subscription",
            description: 'Start a subscription to manage billing',
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Error",
          description: errorData.error || 'Failed to open billing portal',
          variant: "destructive",
        });
        return;
      }
      
      const data = await resp.json();
      console.log('Portal data:', data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: 'No portal URL received',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        title: "Error",
        description: 'Failed to open billing portal',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch('/api/stripe/payment-methods', { headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
    const data = await resp.json();
    if (resp.ok) setCards(data);
  };

  const cancelAtPeriodEnd = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/stripe/cancel', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }});
    await load();
  };

  const resume = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/stripe/resume', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }});
    await load();
  };

  const formatDate = (ms) => ms ? new Date(ms).toLocaleDateString() : '-';

  return (
    <>
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription and payment methods.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-semibold text-lg text-slate-900">{planName}</p>
            {sub?.status && (
              <>
                <p className="text-sm text-slate-600 mt-1">
                  Status: <span className="font-medium capitalize">{sub.status}</span>
                  {sub.cancel_at_period_end && <span className="text-amber-600"> (Cancels at period end)</span>}
                </p>
                <p className="text-sm text-slate-600">
                  {sub.cancel_at_period_end ? 'Ends' : 'Renews'}: {formatDate(sub?.current_period_end)}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasStripeCustomer ? (
              <Button 
                onClick={openPortal} 
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {loading ? 'Opening...' : 'Manage Subscription'}
              </Button>
            ) : (
              <div className="text-sm text-slate-600">
                <span>Start subscription to manage</span>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600 hover:text-blue-700"
                  onClick={() => window.location.href = '/pricing'}
                >
                  Go to pricing
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading && <div className="text-sm text-slate-500">Loading subscription details…</div>}
      </CardContent>
    </Card>


    {/* Cards Modal */}
    <Dialog open={showCards} onOpenChange={setShowCards}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Methods</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {cards.payment_methods.length === 0 ? (
            <div className="text-sm text-slate-600">No cards on file yet.</div>
          ) : (
            cards.payment_methods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between rounded border p-3">
                <div className="text-sm">{pm.brand?.toUpperCase()} •••• {pm.last4} — {pm.exp_month}/{pm.exp_year}</div>
                {cards.default_payment_method_id === pm.id ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Default</span>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={async ()=>{ const { data:{session } } = await supabase.auth.getSession(); await fetch('/api/stripe/payment-methods/set-default',{method:'POST', headers:{'Authorization':`Bearer ${session?.access_token||''}`,'Content-Type':'application/json'}, body:JSON.stringify({paymentMethodId:pm.id})}); await loadCards(); }}>Make Default</Button>
                    <Button size="sm" variant="outline" onClick={async ()=>{ const { data:{session } } = await supabase.auth.getSession(); await fetch('/api/stripe/payment-methods/detach',{method:'POST', headers:{'Authorization':`Bearer ${session?.access_token||''}`,'Content-Type':'application/json'}, body:JSON.stringify({paymentMethodId:pm.id})}); await loadCards(); }}>Remove</Button>
                  </div>
                )}
              </div>
            ))
          )}
          <div className="flex justify-between items-center pt-2">
            <Button onClick={openPortal} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">Add/Update Cards in Portal</Button>
            <Button variant="outline" onClick={loadCards}>Refresh</Button>
          </div>
          <div className="text-xs text-slate-500">Securely managed by Stripe. We don’t store card numbers.</div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

// QRBuilderSettings component removed - moved to Feedback tab
const QRBuilderSettings = () => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState("none");

    useEffect(() => {
        if (user) {
            loadQRCodes();
            loadTechs();
        }
    }, [user]);

    const loadQRCodes = async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const response = await fetch('/api/qr/list', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                setQrCodes(result.qr_codes || []);
            }
        } catch (error) {
            console.error('Error loading QR codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async () => {
        if (!user) return;
        
        try {
            setGenerating(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                toast({
                    title: "Error",
                    description: "Authentication required",
                    variant: "destructive",
                });
                return;
            }

            const response = await fetch('/api/qr/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ tech_id: selectedTech === 'none' ? undefined : selectedTech })
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "QR code generated successfully!",
                });
                loadQRCodes(); // Refresh the list
                setSelectedTech('none'); // Reset selection
            } else {
                throw new Error(result.error || 'Failed to generate QR code');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast({
                title: "Error",
                description: `Failed to generate QR code: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    const loadTechs = async () => {
        try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('business_id')
              .single();
            if (!profile?.business_id) return;
            const { data } = await supabase
              .from('techs')
              .select('id, name')
              .eq('business_id', profile.business_id)
              .order('name');
            setTechs(data || []);
        } catch (e) {}
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied",
            description: "URL copied to clipboard",
        });
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code Builder
                </CardTitle>
                <CardDescription>
                    Generate QR codes for your technicians to track review attribution.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-medium">Your QR Codes</h3>
                        <p className="text-sm text-gray-600">Generate QR codes for tech attribution</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedTech} onValueChange={setSelectedTech}>
                            <SelectTrigger className="w-56">
                                <SelectValue placeholder="Select technician (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No tech (generic)</SelectItem>
                                {techs.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={generateQRCode} disabled={generating} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            {generating ? "Generating..." : "Generate QR Code"}
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-600">Loading QR codes...</p>
                    </div>
                ) : qrCodes.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 mb-2">No QR codes generated yet</p>
                        <p className="text-sm text-gray-500">Click "Generate QR Code" to create your first one</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {qrCodes.map((qr) => (
                            <div key={qr.id} className="p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <QrCode className="w-6 h-6 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">QR Code #{qr.code}</p>
                                            <p className="text-sm text-gray-600">
                                                {qr.scans_count} scans • Created {new Date(qr.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(qr.url)}
                                            className="flex items-center gap-1"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy URL
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(qr.download_url, '_blank')}
                                            className="flex items-center gap-1"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div className="p-2 bg-gray-50 rounded font-mono text-gray-700">{qr.url}</div>
                                    <div className="p-2 bg-gray-50 rounded text-gray-700">{qr.tech_name ? `Tech: ${qr.tech_name}` : 'Generic code'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Generate QR codes for each technician</li>
                        <li>• Print and place at job sites</li>
                        <li>• Customers scan to leave reviews</li>
                        <li>• Track which tech gets credit for reviews</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};


const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const tabs = ["profile", "business", "billing"];

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and business settings."
      />
      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-lg max-w-min">
        {tabs.map(tab => (
            <SettingsTab 
                key={tab} 
                title={tab.charAt(0).toUpperCase() + tab.slice(1)} 
                isActive={activeTab === tab} 
                onClick={() => setSearchParams({tab})} 
            />
        ))}
      </div>
      <div>
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'business' && <BusinessSettings />}
        {activeTab === 'billing' && <BillingSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;


