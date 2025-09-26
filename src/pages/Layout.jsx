import { useLocation, useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";

import { User } from "@/api/entities";
import { getPageNameFromPath, derivePathname, DEFAULT_PAGE_NAME } from "../lib/routing/pageName";
import { useAuth } from "../hooks/useAuth";

import ModernSidebar from "../components/dashboard/ModernSidebar";
import ModernTopNav from "../components/dashboard/ModernTopNav";
import { Header as SharedHeader } from "../components/shared/Header";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { DashboardProvider } from "../components/providers/DashboardProvider";
import ErrorBoundary from "../components/ui/error-boundary";
import QuickSetupWizard from "../components/onboarding/QuickSetupWizard";
import { supabase } from "../lib/supabase/browser";
// Simplified layout - no auth dependencies

        const LandingHeader = React.memo(() => {
            return <SharedHeader />;
        });

const LandingFooter = React.memo(() => {
    return null; // Footer is now handled in individual pages
});

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showQuickSetup, setShowQuickSetup] = useState(false);

  // Listen for Quick Setup events from Dashboard
  useEffect(() => {
    const handleOpenQuickSetup = () => setShowQuickSetup(true);
    window.addEventListener('openQuickSetup', handleOpenQuickSetup);
    return () => window.removeEventListener('openQuickSetup', handleOpenQuickSetup);
  }, []);

  // Derive page name from pathname as single source of truth
  const pathname = derivePathname(location.pathname);
  const currentPage = getPageNameFromPath(pathname);
  
  // Use provided currentPageName or fallback to derived currentPage
  const pageName = currentPageName || currentPage;

  console.log('[LAYOUT] Rendering with currentPageName:', pageName, 'pathname:', pathname, 'children type:', typeof children);

  const isLandingSitePage = ["Landing", "Features", "HowItWorks", "SimpleSetup", "Testimonials", "Paywall", "PostCheckout", "NotFound", "FeedbackCollection", "QRRedirect"].includes(pageName);
  
  console.log('[LAYOUT] isLandingSitePage:', isLandingSitePage, 'currentPageName:', pageName);

  // Simplified layout logic - no auth dependencies

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  
  if (isLandingSitePage) {
    console.log('[LAYOUT] Rendering landing site layout for:', pageName);
    return (
        <div className="bg-white text-gray-900 font-sans min-h-screen flex flex-col">
            <LandingHeader />
            <main className="relative z-10 flex-1">{children}</main>
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
        <DashboardProvider value={{ user }}>
          <ErrorBoundary>
            <div className="flex h-screen bg-[var(--bg)]">
            <ModernSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <ModernTopNav onLogout={handleLogout} onQuickSetup={() => setShowQuickSetup(true)} />

                <main className="flex-1 overflow-y-auto">
                    <div className="h-full">
                        {children}
                    </div>
                </main>
            </div>
            </div>
            
            {/* Quick Setup Wizard */}
            <QuickSetupWizard
              isOpen={showQuickSetup}
              onClose={() => setShowQuickSetup(false)}
              onComplete={() => setShowQuickSetup(false)}
            />
          </ErrorBoundary>
        </DashboardProvider>
    </ThemeProvider>
  );
}




