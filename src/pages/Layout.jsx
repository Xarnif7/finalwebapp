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
import { useAuth } from "../auth/AuthProvider";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { supabase } from "../lib/supabaseClient";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import FeatureFlagToggle from "../components/dev/FeatureFlagToggle";

// Hoist subscription status to avoid multiple calls
const useSubscriptionStatusMemo = () => {
  const subscriptionStatus = useSubscriptionStatus();
  return useMemo(() => subscriptionStatus, [
    subscriptionStatus.active,
    subscriptionStatus.status,
    subscriptionStatus.plan_tier,
    subscriptionStatus.loading
  ]);
};

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

const LandingHeader = React.memo(({ handleLogout, subscriptionStatus }) => {
    const navigate = useNavigate();
    const { user, handleAuth } = useAuth();
    const { active: hasSubscription, onboarding_completed } = subscriptionStatus;

    console.count('Header renders');

    const getButtonText = () => {
        if (!user) return 'Get Started';
        if (hasSubscription) {
            return onboarding_completed ? 'View Dashboard' : 'Resume Onboarding';
        }
        return 'Get Started';
    };

    const handleButtonClick = () => {
        if (!user) {
            handleAuth('/');
        } else if (hasSubscription) {
            if (onboarding_completed) {
                navigate("/dashboard");
            } else {
                navigate("/onboarding");
            }
        } else {
            // Both "Get Started" and "Visit Your Dashboard" go to paywall when no subscription
            navigate("/paywall");
        }
    };

    const handleSwitchAccount = async () => {
        try {
            // Ensure a clean local state, then immediately open account picker
            await supabase.auth.signOut({ scope: 'local' });
        } catch {}
        localStorage.setItem('postLoginRedirect', '/'); // land back on /
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { prompt: 'select_account', include_granted_scopes: 'true' }
            }
        });
    };

    console.log('[HEADER] Button state:', { user: !!user, hasSubscription, onboarding_completed, buttonText: getButtonText() });

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
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Button 
                                data-auth="true" 
                                onClick={handleButtonClick} 
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                {getButtonText()}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                     <div className="cursor-pointer">
                                        <UserAvatar user={user} size="40px" />
                                     </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 z-50">
                                    <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer">
                                        <Repeat className="mr-2 h-4 w-4" />Switch Account
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Button data-auth="true" variant="ghost" onClick={() => handleAuth('/')} className="text-gray-700 hover:text-blue-600">
                                Sign In
                            </Button>
                            <Button data-auth="true" onClick={() => handleAuth('/')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                                Get Started
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
});

const LandingFooter = React.memo(({ handleLogout, subscriptionStatus }) => {
    const { user, handleAuth } = useAuth();
    const { active: hasSubscription, onboarding_completed } = subscriptionStatus;
    const navigate = useNavigate();
    
    console.count('Footer renders');
    
    const getFooterButtonText = () => {
        if (!user) return 'Start Your Free Trial';
        if (hasSubscription) {
            return onboarding_completed ? 'Visit Your Dashboard' : 'Resume Onboarding';
        }
        return 'Get Started';
    };
    
    const handleFooterAction = () => {
        if (user) {
            if (hasSubscription) {
                if (onboarding_completed) {
                    navigate("/dashboard");
                } else {
                    navigate("/onboarding");
                }
            } else {
                navigate("/paywall");
            }
        } else {
            handleAuth('/');
        }
    };
    
    console.log('[FOOTER] Button state:', { user: !!user, hasSubscription, onboarding_completed, buttonText: getFooterButtonText() });
    
    return (
        <footer className="py-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="max-w-7xl mx-auto text-center flex items-center justify-between">
                <p className="text-white">© 2024 Blipp. All rights reserved.</p>
                <Button data-auth="true" 
                    onClick={handleFooterAction}
                    className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    {getFooterButtonText()}
                </Button>
            </div>
        </footer>
    );
});

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [business, setBusiness] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  
  // Use memoized subscription status to prevent multiple calls
  const subscriptionStatus = useSubscriptionStatusMemo();

  console.log('[LAYOUT] Rendering with currentPageName:', currentPageName, 'pathname:', location.pathname, 'children type:', typeof children);

  const updateBusiness = (newBusinessData) => {
    setBusiness(prev => ({...prev, ...newBusinessData}));
  };

  const isLandingSitePage = ["Landing", "Features", "HowItWorks", "SimpleSetup", "Testimonials", "Paywall", "PostCheckout", "NotFound"].includes(currentPageName);
  
  console.log('[LAYOUT] isLandingSitePage:', isLandingSitePage, 'currentPageName:', currentPageName);

  useEffect(() => {
    console.log('[LAYOUT] useEffect triggered:', { currentPageName, isLandingSitePage, user: !!user, loading });
    
    // Don't block onboarding page - it should render normally
    if (location.pathname === '/onboarding') {
      console.log('[LAYOUT] Onboarding page detected, allowing normal render');
      setAuthStatus("authorized");
      return;
    }
    
    // Block redirects from other protected pages
    const block = ['/post-checkout', '/auth/callback'];
    if (block.includes(location.pathname)) {
      console.log('[LAYOUT] Blocking redirect from protected page:', location.pathname);
      return;
    }
    
    if (isLandingSitePage || ["CustomLogin"].includes(currentPageName)) {
      console.log('[LAYOUT] Setting auth status to public');
      setAuthStatus("public");
      return;
    }
    
    // Wait for auth to initialize before making decisions
    if (loading) {
      console.log('[LAYOUT] Still loading, returning');
      return;
    }
    
    // Add a small delay to ensure auth state is fully restored
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Double-check the session after delay
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[LAYOUT] Session check after delay:', { hasSession: !!session, hasUser: !!user });
      
      if (!session && !user) {
        console.log('[LAYOUT] No session or user after delay, setting unauthorized and navigating to landing');
        setAuthStatus("unauthorized");
        navigate("/");
        return;
      }
      
      if (session && !user) {
        console.log('[LAYOUT] Session exists but no user state, waiting for auth state to sync');
        return;
      }
      
      if (user || session) {
        console.log('[LAYOUT] User or session exists, proceeding with business initialization');
        
        // Initialize business for authenticated user
        const initializeBusiness = async () => {
          setAuthStatus("checking");
          try {
            const { data: businesses, error } = await supabase
              .from('businesses')
              .select('*')
              .limit(1); // RLS will automatically filter by auth.uid()
            
            if (!error && businesses && businesses.length > 0) {
              setBusiness(businesses[0]);
            } else if (currentPageName !== 'Onboarding') {
              navigate("/onboarding");
              return;
            }
            setAuthStatus("authorized");
          } catch (error) {
            console.error('[LAYOUT] Business initialization error:', error);
            setAuthStatus("authorized"); // Allow access even if business init fails
          }
        };
        
        initializeBusiness();
      }
    };
    
    checkAuth();
  }, [currentPageName, navigate, isLandingSitePage, user, loading, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  
  if (isLandingSitePage) {
    console.log('[LAYOUT] Rendering landing site layout for:', currentPageName);
    console.log('[LAYOUT] Children type:', typeof children);
    console.log('[LAYOUT] Children:', children);
    return (
        <div className="bg-white text-gray-900 font-sans min-h-screen">
            <LandingHeader handleLogout={handleLogout} subscriptionStatus={subscriptionStatus} />
            <main className="relative z-10">{children}</main>
            <LandingFooter handleLogout={handleLogout} subscriptionStatus={subscriptionStatus} />
        </div>
    );
  }

  // Show loading state while checking auth to prevent flash
  if (authStatus === "checking" || loading) {
      console.log('[LAYOUT] Rendering loading state');
      return null; // No loading indicator to prevent flash
  }

  // Don't show white screen during auth checking - render content immediately
  if (authStatus === "unauthorized") {
      console.log('[LAYOUT] Rendering unauthorized state, redirecting to landing');
      navigate("/");
      return null;
  }

  if (["CustomLogin", "Onboarding", "PostCheckout"].includes(currentPageName)) {
      console.log('[LAYOUT] Rendering simple layout for:', currentPageName);
      return <div>{children}</div>;
  }

  console.log('[LAYOUT] Rendering dashboard layout for:', currentPageName);

  return (
    <ThemeProvider>
        <DashboardProvider value={{ user, business, updateBusiness }}>
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
        <FeatureFlagToggle />
    </ThemeProvider>
  );
}




