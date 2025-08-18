import { useLocation, useNavigate, Link } from "react-router-dom";




import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { User, Business } from "@/api/entities";
import { motion, AnimatePresence } from "framer-motion";
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
import { LogOut, User as UserIcon, Repeat } from "lucide-react";

const UserAvatar = ({ user, size = "40px" }) => {
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

const LandingHeader = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        User.me().then(setUser).catch(() => setUser(null)).finally(() => setIsLoading(false));
    }, []);

    const handleAuthAction = () => {
        if (user) {
            navigate(createPageUrl("Dashboard"));
        } else {
/* User.login();  // disabled auto-redirect */
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                <Link to={createPageUrl("Landing")} className="flex-shrink-0">
                    <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
                        alt="Blipp"
                        className="h-16 w-auto"
                    />
                </Link>
                <nav className="hidden md:flex items-center gap-8">
                    {['Features', 'HowItWorks', 'SimpleSetup', 'Testimonials'].map(page => (
                        <Link
                            key={page}
                            to={createPageUrl(page)}
                            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 relative group"
                        >
                            {page.replace(/([A-Z])/g, ' $1').trim()}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    ))}
                </nav>
                <div className="flex items-center gap-3">
                    {isLoading ? <div className="w-40 h-10 rounded-lg bg-gray-200 animate-pulse" /> : (
                        <>
                            {user ? (
                                <>
                                    <Button data-auth="true" onClick={handleAuthAction} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                                        View Dashboard
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                             <Button data-auth="true" className="group" aria-label="User menu">
                                                <UserAvatar user={user} size="40px" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 z-50">
                                            <DropdownMenuItem onClick={() => navigate(createPageUrl('Settings'))} className="cursor-pointer">
                                                <UserIcon className="mr-2 h-4 w-4" />Profile
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => User.logout()} className="cursor-pointer">
                                                <Repeat className="mr-2 h-4 w-4" />Switch Account
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => User.logout()} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                                                <LogOut className="mr-2 h-4 w-4" />Sign Out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            ) : (
                                <>
  <Link to="/auth">
                                    <Button data-auth="true" variant="ghost" onClick={() => User.login()} className="text-gray-700 hover:text-blue-600">
                                        Sign In
                                    </Button>
  </Link>
                                    <Button data-auth="true" onClick={handleAuthAction} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                                        Get Started
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

const LandingFooter = () => (
    <footer className="py-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto text-center flex items-center justify-between">
            <p className="text-white">Â© 2024 Blipp. All rights reserved.</p>
            <Button data-auth="true" 
                onClick={() => User.me().then(() => window.location.href = createPageUrl("Dashboard")).catch(() => User.login())}
                className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
                Visit Your Dashboard
            </Button>
        </div>
    </footer>
);

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");

  const updateBusiness = (newBusinessData) => {
    setBusiness(prev => ({...prev, ...newBusinessData}));
  };

  const isLandingSitePage = ["Landing", "Features", "HowItWorks", "SimpleSetup", "Testimonials"].includes(currentPageName);

  useEffect(() => {
    if (isLandingSitePage || ["CustomLogin", "Onboarding"].includes(currentPageName)) {
      setAuthStatus("public");
      return;
    }
    
    const initializeAuth = async () => {
      setAuthStatus("checking");
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        const businesses = await Business.filter({ created_by: currentUser.email });
        if (businesses.length > 0) {
          setBusiness(businesses[0]);
        } else if (currentPageName !== 'Onboarding') {
          navigate(createPageUrl("Onboarding"));
          return;
        }
        setAuthStatus("authorized");
      } catch (error) {
        setAuthStatus("unauthorized");
        navigate(createPageUrl("Landing"));
      }
    };
    
    initializeAuth();
  }, [currentPageName, navigate, isLandingSitePage]);

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl("Landing"));
  };
  
  if (isLandingSitePage) {
    return (
        <div className="bg-white text-gray-900 font-sans">
            <LandingHeader />
            <main>{children}</main>
            <LandingFooter />
        </div>
    );
  }

  if (authStatus === "checking" || authStatus === "unauthorized") {
      return <div className="bg-[var(--bg)] h-screen w-screen" />;
  }

  if (["CustomLogin", "Onboarding"].includes(currentPageName)) {
      return <div>{children}</div>;
  }

  return (
    <ThemeProvider>
        <DashboardProvider value={{ user, business, updateBusiness }}>
          <ErrorBoundary>
            <div className="flex h-screen bg-[var(--bg)]">
            <ModernSidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <ModernTopNav onLogout={handleLogout} />

                <main className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="h-full"
                    >
                    {children}
                    </motion.div>
                </AnimatePresence>
                </main>
            </div>
            </div>
          </ErrorBoundary>
        </DashboardProvider>
    </ThemeProvider>
  );
}




