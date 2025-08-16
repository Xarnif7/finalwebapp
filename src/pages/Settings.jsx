import React, { useState } from "react";
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

const ProfileSettings = () => (
    <Card className="rounded-2xl">
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your personal information.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Alex Johnson" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="alex@blipp.com" disabled />
            </div>
            <div className="flex justify-end"><Button>Save Profile</Button></div>
        </CardContent>
    </Card>
);

const BusinessSettings = () => (
    <Card className="rounded-2xl">
        <CardHeader><CardTitle>Business Profile</CardTitle><CardDescription>Manage your main business details.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" defaultValue="Downtown Dental" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue="123 Smile St, Denver, CO" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="googleUrl">Google Review URL</Label>
                <Input id="googleUrl" defaultValue="https://g.page/r/..." />
            </div>
            <div className="flex justify-end"><Button>Save Business Info</Button></div>
        </CardContent>
    </Card>
);

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
            <SettingsTab key={tab} title={tab.charAt(0).toUpperCase() + tab.slice(1)} isActive={activeTab === tab} onClick={() => setSearchParams({tab})} />
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
