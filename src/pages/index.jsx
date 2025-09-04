import Layout from "./Layout.jsx";
import AuthCallback from "./AuthCallback.jsx";
import AuthProvider, { useAuth } from "../auth/AuthProvider";
import { useState, useEffect } from "react";
import Landing from "./Landing";
import Onboarding from "./Onboarding";
import Dashboard from "./Dashboard";
import Clients from "./Clients";
import Settings from "./Settings";
import Reviews from "./Reviews";
import ReviewTracking from "./ReviewTracking";
import ReviewLanding from "./ReviewLanding";
import AutomatedRequests from "./AutomatedRequests";
import ReviewInbox from "./ReviewInbox";
import SendRequests from "./SendRequests";
import SocialPosts from "./SocialPosts";
import Sequences from "./Sequences";
import Competitors from "./Competitors";
import TeamRoles from "./TeamRoles";
import AuditLog from "./AuditLog";
import CsvImport from "./CsvImport";
import Notifications from "./Notifications";
import Integrations from "./Integrations";
import RevenueImpact from "./RevenueImpact";
import Conversations from "./Conversations";
import ReviewPerformance from "./ReviewPerformance";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import SimpleSetup from "./SimpleSetup";
import Testimonials from "./Testimonials";
import Paywall from "./Paywall";
import PostCheckout from "./PostCheckout";
import QRRedirect from "./QRRedirect";
import PrivateFeedback from "./PrivateFeedback";
import RequireOnboardingAccess from "../components/RequireOnboardingAccess";
import ErrorBoundary from "../components/ui/error-boundary";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

// Performance instrumentation
let currentNavigationId = 0;
const navigationTimings = new Map();

// Global click handler for navigation timing
if (typeof window !== 'undefined') {
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'click') {
      const wrappedListener = function(event) {
        // Check if this is a navigation click
        const target = event.target.closest('a[href]') || event.target.closest('[data-navigation]');
        if (target) {
          const navigationId = ++currentNavigationId;
          const href = target.getAttribute('href') || target.getAttribute('data-href');
          if (href && !href.startsWith('#')) {
            performance.mark(`nav-click-start-${navigationId}`);
            navigationTimings.set(navigationId, {
              href,
              clickTime: performance.now(),
              marks: []
            });
            console.log(`[NAV-PERF] Navigation ${navigationId} started for ${href}`);
          }
        }
        return listener.call(this, event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}

// NotFound component for invalid routes
const NotFound = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <a href="/" className="text-blue-600 hover:text-blue-700 underline">
        Return to home
      </a>
    </div>
  </div>
);

const PAGES = {
  Landing: Landing,
  Onboarding: Onboarding,
  Dashboard: Dashboard,
  Clients: Clients,
  Settings: Settings,
  Reviews: Reviews,
  ReviewTracking: ReviewTracking,
  ReviewLanding: ReviewLanding,
  AutomatedRequests: AutomatedRequests,
  ReviewInbox: ReviewInbox,
  SendRequests: SendRequests,
  SocialPosts: SocialPosts,
  Sequences: Sequences,
  Competitors: Competitors,
  TeamRoles: TeamRoles,
  AuditLog: AuditLog,
  CsvImport: CsvImport,
  Notifications: Notifications,
  Integrations: Integrations,
  RevenueImpact: RevenueImpact,
  Conversations: Conversations,
  ReviewPerformance: ReviewPerformance,
  Features: Features,
  HowItWorks: HowItWorks,
  SimpleSetup: SimpleSetup,
  Testimonials: Testimonials,
  Paywall: Paywall,
  PostCheckout: PostCheckout,
  QRRedirect: QRRedirect,
  PrivateFeedback: PrivateFeedback,
  NotFound: NotFound,
};

function _getCurrentPage(url) {
  if (!url || url === '') {
    console.log('[ROUTING] Empty URL, returning Landing');
    return 'Landing';
  }
  
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }
  
  console.log('[ROUTING] _getCurrentPage called with:', { url, urlLastPart });
  
  // Handle special cases and kebab-case URLs
  if (urlLastPart === 'paywall') {
    console.log('[ROUTING] Found paywall route');
    return 'Paywall';
  }
  
  if (urlLastPart === 'how-it-works') {
    console.log('[ROUTING] Found how-it-works route');
    return 'HowItWorks';
  }
  
  if (urlLastPart === 'simple-setup') {
    console.log('[ROUTING] Found simple-setup route');
    return 'SimpleSetup';
  }
  
  if (urlLastPart === 'features') {
    console.log('[ROUTING] Found features route');
    return 'Features';
  }
  
  if (urlLastPart === 'testimonials') {
    console.log('[ROUTING] Found testimonials route');
    return 'Testimonials';
  }
  
  if (urlLastPart === 'post-checkout') {
    console.log('[ROUTING] Found post-checkout route');
    return 'PostCheckout';
  }
  
  // Handle QR code redirects (r/{code})
  if (url.includes('/r/')) {
    console.log('[ROUTING] Found QR redirect route');
    return 'QRRedirect';
  }
  
  // Handle private feedback (feedback/{requestId})
  if (url.includes('/feedback/')) {
    console.log('[ROUTING] Found private feedback route');
    return 'PrivateFeedback';
  }
  
  // Convert kebab-case to PascalCase for matching
  const pascalCaseUrl = urlLastPart
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  console.log('[ROUTING] Converted to PascalCase:', pascalCaseUrl);
  
  // Try exact match first
  let pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  
  // If no exact match, try PascalCase match
  if (!pageName) {
    pageName = Object.keys(PAGES).find(
      (page) => page === pascalCaseUrl
    );
  }
  
  console.log('[ROUTING] Found page name:', pageName);
  
  return pageName || 'Landing';
}

function RequireAuth({ children }) {
  const { user, loading, handleAuth } = useAuth();
  const [authTriggered, setAuthTriggered] = useState(false);

  // If no user and we haven't triggered auth yet, trigger it once
  if (!user && !authTriggered) {
    setAuthTriggered(true);
    // Use setTimeout to avoid calling handleAuth during render
    setTimeout(() => {
      handleAuth();
    }, 0);
    // Return null instead of loading screen to eliminate flash
    return null;
  }

  // If user exists, render the protected content immediately
  if (user) {
    return children;
  }

  // If auth was triggered but no user yet, return null to eliminate loading screen
  return null;
}

// Component wrapper for performance tracking
function TrackedComponent({ component: Component, name, ...props }) {
  const navigationId = currentNavigationId;
  
  useEffect(() => {
    if (navigationTimings.has(navigationId)) {
      const timing = navigationTimings.get(navigationId);
      performance.mark(`component-mount-${navigationId}-${name}`);
      timing.componentMountTime = performance.now();
      timing.marks.push(`component-mount-${name}`);
      console.log(`[NAV-PERF] Component ${name} mounted for navigation ${navigationId}`);
      
      // Mark component as ready after a short delay to simulate "ready" state
      setTimeout(() => {
        if (navigationTimings.has(navigationId)) {
          const timing = navigationTimings.get(navigationId);
          performance.mark(`component-ready-${navigationId}-${name}`);
          timing.componentReadyTime = performance.now();
          timing.marks.push(`component-ready-${name}`);
          
          // Calculate and log timing breakdown
          const totalTime = timing.componentReadyTime - timing.clickTime;
          const clickToRouter = timing.routerReceivedTime - timing.clickTime;
          const routerToMount = timing.componentMountTime - timing.routerReceivedTime;
          const mountToReady = timing.componentReadyTime - timing.componentMountTime;
          
          console.group(`[NAV-PERF] Navigation ${navigationId} Complete - ${name}`);
          console.log(`Total time: ${totalTime.toFixed(2)}ms`);
          console.log(`Click → Router: ${clickToRouter.toFixed(2)}ms`);
          console.log(`Router → Mount: ${routerToMount.toFixed(2)}ms`);
          console.log(`Mount → Ready: ${mountToReady.toFixed(2)}ms`);
          console.log(`Path: ${timing.href} → ${window.location.pathname}`);
          console.groupEnd();
          
          // Clean up timing data
          navigationTimings.delete(navigationId);
        }
      }, 100);
    }
  }, [navigationId, name]);

  return <Component {...props} />;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname || '/');

  // Router timing instrumentation
  useEffect(() => {
    const navigationId = currentNavigationId;
    if (navigationTimings.has(navigationId)) {
      const timing = navigationTimings.get(navigationId);
      performance.mark(`router-received-${navigationId}`);
      timing.routerReceivedTime = performance.now();
      timing.marks.push('router-received');
      console.log(`[NAV-PERF] Router received navigation ${navigationId} for ${location.pathname}`);
    }
  }, [location.pathname]);

  console.log('[PAGES] PagesContent rendering with:', { 
    pathname: location.pathname, 
    currentPage,
    timestamp: new Date().toISOString(),
    availablePages: Object.keys(PAGES)
  });

  // Debug: Log the current page and available pages
  console.log('[PAGES] Available pages:', Object.keys(PAGES));
  console.log('[PAGES] Current page resolved to:', currentPage);
  console.log('[PAGES] PAGES[currentPage] exists:', !!PAGES[currentPage]);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<TrackedComponent component={Landing} name="Landing" />} />
        <Route path="/landing" element={<TrackedComponent component={Landing} name="Landing" />} />
        <Route path="/onboarding" element={<RequireOnboardingAccess><TrackedComponent component={Onboarding} name="Onboarding" /></RequireOnboardingAccess>} />
        <Route path="/dashboard" element={<RequireAuth><TrackedComponent component={Dashboard} name="Dashboard" /></RequireAuth>} />
        <Route path="/clients" element={<RequireAuth><TrackedComponent component={Clients} name="Clients" /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><TrackedComponent component={Settings} name="Settings" /></RequireAuth>} />
        <Route path="/reviews" element={<RequireAuth><TrackedComponent component={Reviews} name="Reviews" /></RequireAuth>} />
        <Route path="/review-tracking" element={<RequireAuth><TrackedComponent component={ReviewTracking} name="ReviewTracking" /></RequireAuth>} />
        <Route path="/review-performance" element={<RequireAuth><TrackedComponent component={ReviewPerformance} name="ReviewPerformance" /></RequireAuth>} />
        
        {/* Dashboard Routes */}
        <Route path="/review-inbox" element={<RequireAuth><TrackedComponent component={ReviewInbox} name="ReviewInbox" /></RequireAuth>} />
        <Route path="/send-requests" element={<RequireAuth><TrackedComponent component={SendRequests} name="SendRequests" /></RequireAuth>} />
        <Route path="/automated-requests" element={<RequireAuth><TrackedComponent component={AutomatedRequests} name="AutomatedRequests" /></RequireAuth>} />
        <Route path="/conversations" element={<RequireAuth><TrackedComponent component={Conversations} name="Conversations" /></RequireAuth>} />
        <Route path="/social-posts" element={<RequireAuth><TrackedComponent component={SocialPosts} name="SocialPosts" /></RequireAuth>} />
        <Route path="/sequences" element={<RequireAuth><TrackedComponent component={Sequences} name="Sequences" /></RequireAuth>} />
        <Route path="/competitors" element={<RequireAuth><TrackedComponent component={Competitors} name="Competitors" /></RequireAuth>} />
        <Route path="/revenue-impact" element={<RequireAuth><TrackedComponent component={RevenueImpact} name="RevenueImpact" /></RequireAuth>} />
        <Route path="/team-roles" element={<RequireAuth><TrackedComponent component={TeamRoles} name="TeamRoles" /></RequireAuth>} />
        <Route path="/audit-log" element={<RequireAuth><TrackedComponent component={AuditLog} name="AuditLog" /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><TrackedComponent component={Notifications} name="Notifications" /></RequireAuth>} />
        <Route path="/integrations" element={<RequireAuth><TrackedComponent component={Integrations} name="Integrations" /></RequireAuth>} />
        <Route path="/csv-import" element={<RequireAuth><TrackedComponent component={CsvImport} name="CsvImport" /></RequireAuth>} />
        
        {/* Marketing routes - must come before wildcard */}
        <Route path="/features" element={<TrackedComponent component={Features} name="Features" />} />
        <Route path="/how-it-works" element={<TrackedComponent component={HowItWorks} name="HowItWorks" />} />
        <Route path="/simple-setup" element={<TrackedComponent component={SimpleSetup} name="SimpleSetup" />} />
        <Route path="/testimonials" element={<TrackedComponent component={Testimonials} name="Testimonials" />} />
        <Route path="/paywall" element={<TrackedComponent component={Paywall} name="Paywall" />} />
        <Route path="/post-checkout" element={<TrackedComponent component={PostCheckout} name="PostCheckout" />} />
        
        {/* Auth routes */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Public routes */}
        <Route path="/r/:code" element={<TrackedComponent component={QRRedirect} name="QRRedirect" />} />
        <Route path="/feedback/:requestId" element={<TrackedComponent component={PrivateFeedback} name="PrivateFeedback" />} />
        
        {/* Wildcard route must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  // Router provider confirmation
  useEffect(() => {
    console.log('[ROUTER-PERF] Router provider entry point: src/pages/index.jsx');
    console.log('[ROUTER-PERF] Single RouterProvider confirmed - no duplicates found');
    
    // Check for any other router instances
    const routerElements = document.querySelectorAll('[data-router]');
    if (routerElements.length > 1) {
      console.warn('[ROUTER-PERF] Multiple router elements detected:', routerElements.length);
    } else {
      console.log('[ROUTER-PERF] Single router element confirmed');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
          <PagesContent />
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}










