import { useLocation, useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";

import { User } from "@/api/entities";
import { getPageNameFromPath, derivePathname, DEFAULT_PAGE_NAME } from "../lib/routing/pageName";

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
import { supabase } from "../lib/supabase/browser";
import { AuthCTA } from "../components/auth/AuthCTA";
import { UserMenu } from "../components/auth/UserMenu";
import { useAuth } from "../components/auth/AuthProvider";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { PrimaryCTA } from "../components/marketing/ctas";

// Simplified layout - no auth dependencies

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
            const { status: authStatus, user } = useAuth();
            const { active: hasActive } = useSubscriptionStatus();
            
            return (
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
                    <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                        <Link to="/" className="flex-shrink-0">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
                                alt="Blipp"
                                className="h-16 w-auto"
                            />
                        </Link>
                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                to="/features"
                                className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
                            >
                                Features
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
                            >
                                How It Works
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                            <Link
                                to="/simple-setup"
                                className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
                            >
                                Simple Setup
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                            <Link
                                to="/testimonials"
                                className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
                            >
                                Testimonials
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        </nav>
                        <div className="flex items-center gap-3 md:gap-4">
                            <PrimaryCTA />
                            {authStatus === 'signedIn' && user && <UserMenu />}
                        </div>
                    </div>
                </header>
            );
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

  // Derive page name from pathname as single source of truth
  const pathname = derivePathname(location.pathname);
  const currentPage = getPageNameFromPath(pathname);
  
  // Use provided currentPageName or fallback to derived currentPage
  const pageName = currentPageName || currentPage;

  console.log('[LAYOUT] Rendering with currentPageName:', pageName, 'pathname:', pathname, 'children type:', typeof children);

  const isLandingSitePage = ["Landing", "Features", "HowItWorks", "SimpleSetup", "Testimonials", "Paywall", "PostCheckout", "NotFound"].includes(pageName);
  
  console.log('[LAYOUT] isLandingSitePage:', isLandingSitePage, 'currentPageName:', pageName);

  // Simplified layout logic - no auth dependencies

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  
  if (isLandingSitePage) {
    console.log('[LAYOUT] Rendering landing site layout for:', pageName);
    return (
        <div className="bg-white text-gray-900 font-sans min-h-screen">
            <LandingHeader />
            <main className="relative z-10">{children}</main>
            <LandingFooter />
        </div>
    );
  }

  if (["CustomLogin", "Onboarding", "PostCheckout"].includes(pageName)) {
      console.log('[LAYOUT] Rendering simple layout for:', pageName);
      return <div>{children}</div>;
  }

  console.log('[LAYOUT] Rendering dashboard layout for:', pageName);

  return (
    <ThemeProvider>
        <DashboardProvider value={{ user: null }}>
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




