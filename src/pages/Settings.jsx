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
import { Star, Zap, Crown } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [cards, setCards] = useState({ payment_methods: [], default_payment_method_id: null });
  const BASIC = import.meta.env.VITE_STRIPE_BASIC_PRICE_ID;
  const PRO = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
  const ENTERPRISE = import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID;

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/stripe/subscription', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await resp.json();
      if (resp.ok) {
        setSub(data.subscription);
        setSchedule(data.schedule);
      }
    } finally { setLoading(false); }
  };

  const openPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch('/api/stripe/portal', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }});
    const data = await resp.json();
    if (resp.ok && data.url) window.location.href = data.url;
  };

  const loadCards = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch('/api/stripe/payment-methods', { headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
    const data = await resp.json();
    if (resp.ok) setCards(data);
  };

  const scheduleChange = async (priceId) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/stripe/change-plan', { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ targetPriceId: priceId }) });
    await load();
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

  // Pretty plan cards (same aesthetic as Paywall)
  const plans = [
    {
      id: 'basic',
      label: 'Standard',
      priceId: BASIC,
      price: '$49.99',
      period: '/ month',
      description: 'Perfect for small businesses getting started',
      features: [
        'Up to 100 review requests / mo',
        'Basic automations',
        'Email support',
      ],
      icon: Star,
      popular: false,
    },
    {
      id: 'pro',
      label: 'Pro',
      priceId: PRO,
      price: '$89.99',
      period: '/ month',
      description: 'Ideal for growing teams with more needs',
      features: [
        'Up to 500 review requests / mo',
        'Advanced sequences',
        'Priority support',
      ],
      icon: Zap,
      popular: true,
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      priceId: ENTERPRISE,
      price: '$179.99',
      period: '/ month',
      description: 'For large businesses with complex workflows',
      features: [
        'Unlimited requests',
        'Custom workflows',
        'Dedicated manager',
      ],
      icon: Crown,
      popular: false,
    },
  ];

  return (
    <>
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>Manage your subscription, cards and plan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-medium">{sub?.status ? sub.status.toUpperCase() : 'No subscription'}</p>
            <p className="text-sm text-slate-600">Renews: {formatDate(sub?.current_period_end)} • Cancel at period end: {sub?.cancel_at_period_end ? 'Yes' : 'No'}</p>
            {schedule?.phases?.length > 1 && (
              <p className="text-xs text-slate-500">Next plan change scheduled after current cycle.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setShowCards(true); loadCards(); }}>Manage Payment Methods</Button>
            {!sub?.cancel_at_period_end ? (
              <Button variant="outline" onClick={cancelAtPeriodEnd}>Cancel at Period End</Button>
            ) : (
              <Button variant="outline" onClick={resume}>Resume</Button>
            )}
            <Button onClick={() => setShowPlans(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">Manage Subscription</Button>
          </div>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg">
          <p className="font-medium mb-2">Change plan for next cycle</p>
          <div className="flex flex-wrap gap-2">
            {BASIC && <Button variant="outline" onClick={() => scheduleChange(BASIC)}>Basic</Button>}
            {PRO && <Button variant="outline" onClick={() => scheduleChange(PRO)}>Pro</Button>}
            {ENTERPRISE && <Button variant="outline" onClick={() => scheduleChange(ENTERPRISE)}>Enterprise</Button>}
          </div>
          <p className="text-xs text-slate-500 mt-2">Takes effect after your current paid period ends.</p>
        </div>

        {loading && <div className="text-sm text-slate-500">Loading…</div>}
      </CardContent>
    </Card>

    {/* Plans Modal */}
    <Dialog open={showPlans} onOpenChange={setShowPlans}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isActive = sub?.current_price === p.priceId;
            const isScheduled = !isActive && (schedule?.phases?.[1]?.prices?.some(pr => pr?.id === p.priceId));
            return (
              <div
                key={p.id}
                className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  p.popular ? 'border-purple-500 shadow-purple-100' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      p.popular ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      <p.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{p.label}</h3>
                    <p className="text-gray-600 mb-2">{p.description}</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                      <span className="text-gray-600 ml-1">{p.period}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {isActive && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Active plan</span>
                      )}
                      {isScheduled && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Scheduled next</span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    disabled={isActive}
                    onClick={() => scheduleChange(p.priceId)}
                    className={`w-full ${
                      p.popular
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                  >
                    {isActive ? 'Current' : 'Switch next cycle'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-slate-500 mt-3">Changes apply after your current billing period.</div>
      </DialogContent>
    </Dialog>

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


