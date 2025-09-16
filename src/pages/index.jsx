import Layout from "./Layout.jsx";
import AuthCallback from "./AuthCallback.jsx";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { Header } from "../components/shared/Header";
import { useState, useEffect } from "react";
import { getPageNameFromPath, DEFAULT_PAGE_NAME } from "../lib/routing/pageName";
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
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { SubscriptionGate } from "../components/auth/SubscriptionGate";
import { LoginGuard, DashboardGuard } from "../components/auth/RouteGuards";
import { legacyUrlMappings } from "../config/nav";
import { FEATURE_FLAGS, isFeatureEnabled } from "../lib/featureFlags";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

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
  // Delegate to the routing utility for consistent page name resolution
  const pageName = getPageNameFromPath(url || '/');
  console.log('[ROUTING] _getCurrentPage called with:', { url, resolvedPage: pageName });
  return pageName;
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

  // Determine if this is a dashboard route that needs auth
  const isDashboardRoute = [
    'Onboarding', 'Dashboard', 'Clients', 'Settings', 'Reviews', 'ReviewTracking', 
    'ReviewLanding', 'AutomatedRequests', 'ReviewInbox', 'SendRequests', 'SocialPosts', 
    'Sequences', 'Competitors', 'TeamRoles', 'AuditLog', 'CsvImport', 'Notifications', 
    'Integrations', 'RevenueImpact', 'Conversations', 'ReviewPerformance', 'PrivateFeedback'
  ].includes(currentPage);

  if (isDashboardRoute) {
    return (
      <Layout currentPageName={currentPage}>
        <DashboardRoutes />
      </Layout>
    );
  }

  return (
    <Layout currentPageName={currentPage}>
      <MarketingRoutes />
    </Layout>
  );
}

// Dashboard routes that require auth
const DashboardRoutes = () => (
  <AuthProvider>
    <ErrorBoundary>
      <Routes>
        {/* Customers Tab */}
        <Route path="/customers" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Clients} name="Clients" /></ProtectedRoute>} />
        <Route path="/customers/import" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={CsvImport} name="CsvImport" /></ProtectedRoute>} />
        
        {/* Automations Tab */}
        <Route path="/automations" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={SendRequests} name="SendRequests" /></ProtectedRoute>} />
        <Route path="/automations/send-requests" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={SendRequests} name="SendRequests" /></ProtectedRoute>} />
        <Route path="/automations/automated-requests" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={AutomatedRequests} name="AutomatedRequests" /></ProtectedRoute>} />
        <Route path="/automations/sequences" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Sequences} name="Sequences" /></ProtectedRoute>} />
        <Route path="/automations/social-posts" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={SocialPosts} name="SocialPosts" /></ProtectedRoute>} />
        
        {/* Reviews Tab */}
        <Route path="/reviews" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Reviews} name="Reviews" /></ProtectedRoute>} />
        <Route path="/reviews/inbox" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={ReviewInbox} name="ReviewInbox" /></ProtectedRoute>} />
        <Route path="/reviews/performance" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={ReviewPerformance} name="ReviewPerformance" /></ProtectedRoute>} />
        <Route path="/reviews/tracking" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={ReviewTracking} name="ReviewTracking" /></ProtectedRoute>} />
        
        {/* Reporting Tab (Main Dashboard) */}
        <Route path="/reporting" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Dashboard} name="Dashboard" /></ProtectedRoute>} />
        <Route path="/reporting/revenue-impact" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={RevenueImpact} name="RevenueImpact" /></ProtectedRoute>} />
        <Route path="/reporting/competitors" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Competitors} name="Competitors" /></ProtectedRoute>} />
        <Route path="/reporting/conversations" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={Conversations} name="Conversations" /></ProtectedRoute>} />
        
        {/* Settings Tab */}
        <Route path="/settings" element={<ProtectedRoute><TrackedComponent component={Settings} name="Settings" /></ProtectedRoute>} />
        <Route path="/settings/integrations" element={<ProtectedRoute><TrackedComponent component={Integrations} name="Integrations" /></ProtectedRoute>} />
        <Route path="/settings/team-roles" element={<ProtectedRoute><TrackedComponent component={TeamRoles} name="TeamRoles" /></ProtectedRoute>} />
        <Route path="/settings/audit-log" element={<ProtectedRoute><TrackedComponent component={AuditLog} name="AuditLog" /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><TrackedComponent component={Notifications} name="Notifications" /></ProtectedRoute>} />
        
        {/* Public Feedback Tab (Feature Flagged) */}
        {isFeatureEnabled(FEATURE_FLAGS.PUBLIC_FEEDBACK_ENABLED) && (
          <Route path="/public-feedback" element={<ProtectedRoute requireActiveSubscription><TrackedComponent component={PrivateFeedback} name="PrivateFeedback" /></ProtectedRoute>} />
        )}
        
        {/* Onboarding */}
        <Route path="/onboarding" element={<RequireOnboardingAccess><TrackedComponent component={Onboarding} name="Onboarding" /></RequireOnboardingAccess>} />
      </Routes>
    </ErrorBoundary>
  </AuthProvider>
);

// Marketing routes that now have auth context for reactive UI
const MarketingRoutes = () => (
  <AuthProvider>
    <Routes>
      {/* Landing and Auth Routes */}
      <Route path="/" element={<TrackedComponent component={Landing} name="Landing" />} />
      <Route path="/landing" element={<TrackedComponent component={Landing} name="Landing" />} />
      <Route path="/login" element={<LoginGuard><TrackedComponent component={Landing} name="Landing" /></LoginGuard>} />
      <Route path="/pricing" element={<TrackedComponent component={Paywall} name="Paywall" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Marketing routes */}
      <Route path="/features" element={<TrackedComponent component={Features} name="Features" />} />
      <Route path="/how-it-works" element={<TrackedComponent component={HowItWorks} name="HowItWorks" />} />
      <Route path="/simple-setup" element={<TrackedComponent component={SimpleSetup} name="SimpleSetup" />} />
      <Route path="/testimonials" element={<TrackedComponent component={Testimonials} name="Testimonials" />} />
      <Route path="/paywall" element={<TrackedComponent component={Paywall} name="Paywall" />} />
      <Route path="/post-checkout" element={<TrackedComponent component={PostCheckout} name="PostCheckout" />} />
      
      {/* Public routes */}
      <Route path="/r/:code" element={<TrackedComponent component={QRRedirect} name="QRRedirect" />} />
      <Route path="/feedback/:requestId" element={<TrackedComponent component={PrivateFeedback} name="PrivateFeedback" />} />
      
      {/* LEGACY REDIRECTS - Maintain query parameters */}
      {Object.entries(legacyUrlMappings).map(([oldPath, newPath]) => (
        <Route 
          key={oldPath}
          path={oldPath} 
          element={<Navigate to={newPath} replace />} 
        />
      ))}
      
      {/* Wildcard route must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
);

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
      <ErrorBoundary>
        <PagesContent />
      </ErrorBoundary>
    </Router>
  );
}










