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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/ui/PageHeader";
import IntegrationsTab from "@/components/settings/IntegrationsTab";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { supabase } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, Download, Copy, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
                .select('id, name, website')
                .eq('id', businessId)
                .maybeSingle();

            if (biz) {
                setBusinessName(biz.name || "");
                setWebsite(biz.website || "");
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
            console.log('Saving business:', { name: businessName, website });
            const { data: { session } } = await supabase.auth.getSession();
            const resp = await fetch('/api/business/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({ name: businessName, website })
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
                    <Label htmlFor="googleUrl">Google Review URL (optional)</Label>
                    <Input id="googleUrl" placeholder="Managed via Reviews → Google connection" disabled />
                    <p className="text-xs text-gray-500">This comes from your connected Google source in Reviews.</p>
                </div>
                <div className="flex justify-end">
                    <Button onClick={saveBusiness} disabled={loading}>{loading ? 'Saving...' : 'Save Business Info'}</Button>
                </div>
            </CardContent>
        </Card>
    );
};

const BillingSettings = () => (
    <Card className="rounded-2xl">
        <CardHeader><CardTitle>Billing</CardTitle><CardDescription>Manage your subscription and payment method.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                <div>
                    <p className="font-medium">Pro Plan</p>
                    <p className="text-sm text-slate-500">$99/month, renews on Aug 20, 2024</p>
                </div>
                <Button variant="outline">Manage Subscription</Button>
            </div>
        </CardContent>
    </Card>
);

const QRBuilderSettings = () => {
    const { user } = useDashboard();
    const { toast } = useToast();
    const [qrCodes, setQrCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [techs, setTechs] = useState([]);
    const [selectedTech, setSelectedTech] = useState("");

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
                body: JSON.stringify({ tech_id: selectedTech || undefined })
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "QR code generated successfully!",
                });
                loadQRCodes(); // Refresh the list
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
                                <SelectItem value="">No tech (generic)</SelectItem>
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
  const tabs = ["profile", "business", "billing", "integrations", "qr-builder"];

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
                title={tab === 'qr-builder' ? 'QR Builder' : tab.charAt(0).toUpperCase() + tab.slice(1)} 
                isActive={activeTab === tab} 
                onClick={() => setSearchParams({tab})} 
            />
        ))}
      </div>
      <div>
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'business' && <BusinessSettings />}
        {activeTab === 'billing' && <BillingSettings />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'qr-builder' && <QRBuilderSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;


