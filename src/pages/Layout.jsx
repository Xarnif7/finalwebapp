import { useLocation, useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";

import { User } from "@/api/entities";

import ModernSidebar from "../components/dashboard/ModernSidebar";
import ModernTopNav from "../components/dashboard/ModernTopNav";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { DashboardProvider } from "../components/providers/DashboardProvider";
import ErrorBoundary from "../components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Repeat, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { Header } from "../components/Header";

// Simplified layout - auth and subscription status handled by components

const UserAvatar = ({ user, size = "40px" }) => {
  const getInitials = () => {
    // Try to get full name from user metadata first, then fallback to email
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div 
      className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-full flex items-center justify-center font-semibold text-sm ring-2 ring-transparent group-hover:ring-purple-300 group-focus:ring-purple-400 transition-all"
      style={{ width: size, height: size }}
    >
      {getInitials()}
    </div>
  );
};

        const LandingHeader = React.memo(() => {
            return <Header />;
        });

const LandingFooter = React.memo(() => {
    return (
        <footer className="py-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="max-w-7xl mx-auto text-center flex items-center justify-between">
                <p className="text-white">© 2024 Blipp. All rights reserved.</p>
                <AuthCTA />
            </div>
        </footer>
    );
});

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  console.log('[LAYOUT] Rendering with currentPageName:', currentPageName, 'pathname:', location.pathname, 'children type:', typeof children);

  const isLandingSitePage = ["Landing", "Features", "HowItWorks", "SimpleSetup", "Testimonials", "Paywall", "PostCheckout", "NotFound"].includes(currentPageName);
  
  console.log('[LAYOUT] isLandingSitePage:', isLandingSitePage, 'currentPageName:', currentPageName);

  // Simplified layout logic - auth guards are handled by route components

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  
  if (isLandingSitePage) {
    console.log('[LAYOUT] Rendering landing site layout for:', currentPageName);
    return (
        <div className="bg-white text-gray-900 font-sans min-h-screen">
            <LandingHeader />
            <main className="relative z-10">{children}</main>
            <LandingFooter />
        </div>
    );
  }

  if (["CustomLogin", "Onboarding", "PostCheckout"].includes(currentPageName)) {
      console.log('[LAYOUT] Rendering simple layout for:', currentPageName);
      return <div>{children}</div>;
  }

  console.log('[LAYOUT] Rendering dashboard layout for:', currentPageName);

  return (
    <ThemeProvider>
        <DashboardProvider value={{ user }}>
          <ErrorBoundary>
            <div className="flex h-screen bg-[var(--bg)]">
            <ModernSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <ModernTopNav onLogout={handleLogout} />

                <main className="flex-1 overflow-y-auto">
                    <div className="h-full">
                        {children}
                    </div>
                </main>
            </div>
            </div>
          </ErrorBoundary>
        </DashboardProvider>
    </ThemeProvider>
  );
}




