
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KpiTile from "@/components/ui/KpiTile";
import StatDelta from "@/components/ui/StatDelta";
import { Users, Star, TrendingUp, MessageSquare, Plus, ArrowRight, Zap, Shield, BarChart3, Send, Clock, Settings, Instagram, Compass } from "lucide-react";

import { useDashboard } from "@/components/providers/DashboardProvider";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import { supabase } from "@/lib/supabase/browser";
import { useAuth } from "@/components/auth/AuthProvider";

const kpiData = [
  { 
    title: "Total Reviews", 
    value: "89", 
    change: "+12%", 
    icon: Star, 
    bgColor: "bg-yellow-50", 
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    href: "review-performance"
  },
  { 
    title: "Average Rating", 
    value: "4.8/5", 
    change: "+0.2", 
    icon: TrendingUp, 
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    href: "review-performance"
  },
  { 
    title: "Response Rate", 
    value: "87%", 
    change: "+5%", 
    icon: MessageSquare, 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    href: "review-performance"
  },
  { 
    title: "Revenue Impact", 
    value: "$47K", 
    change: "+$8K", 
    icon: BarChart3, 
    bgColor: "bg-purple-50", 
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    href: "revenue-impact"
  },
];

const recentReviews = [
  { platform: "Google", rating: 5, text: "Amazing service! Will come back.", time: "2h ago", customer: "Sarah J." },
  { platform: "Yelp", rating: 5, text: "The team was so professional.", time: "1d ago", customer: "Mike C." },
  { platform: "Facebook", rating: 4, text: "Good experience overall.", time: "2d ago", customer: "Emily R." },
  { platform: "Google", rating: 5, text: "Highly recommend this business!", time: "3d ago", customer: "David L." },
];

const quickActions = [
  { label: 'Add Customer', icon: Plus, url: 'clients', color: 'text-green-600' },
  { label: 'Send Request', icon: Send, url: 'automated-requests', color: 'text-blue-600' },
  { label: 'View Messages', icon: MessageSquare, url: 'conversations', color: 'text-purple-600' },
  { label: 'Integrations', icon: Shield, url: 'integrations', color: 'text-orange-600' },
  { label: 'Review Inbox', icon: Star, url: 'review-inbox', color: 'text-yellow-600' },
  { label: 'Revenue Impact', icon: BarChart3, url: 'revenue-impact', color: 'text-indigo-600' },
  { label: 'Social Posts', icon: Instagram, url: 'social-posts', color: 'text-pink-600' },
  { label: 'Competitors', icon: Compass, url: 'competitors', color: 'text-teal-600' },
];

const platformColors = {
  Google: "bg-white text-purple-600 border-purple-200",
  Yelp: "bg-white text-red-600 border-red-200",
  Facebook: "bg-white text-blue-600 border-blue-200",
};

const StarRating = ({ rating }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
    </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useDashboard();
  const { user } = useAuth();
  const businessName = business?.name || "Your Business";
  const [isVisible, setIsVisible] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [showSetupChecklist, setShowSetupChecklist] = useState(true);

  // Check if this is a first-time user and auto-launch Quick Setup
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('quick_setup_completed')
          .eq('id', user.id)
          .single();

        // If user hasn't completed quick setup, auto-launch it
        if (!profile?.quick_setup_completed) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('openQuickSetup'));
          }, 2000); // Wait 2 seconds after dashboard loads
        }
      } catch (error) {
        console.error('Error checking first-time user status:', error);
      }
    };

    if (user) {
      checkFirstTimeUser();
    }
  }, [user]);

  // Show branded loading screen first, then transition to dashboard
  useEffect(() => {
    // Show loading screen for a brief moment
    const loadingTimer = setTimeout(() => {
      setShowLoading(false);
      // Then trigger the dashboard animation
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }, 800); // Show loading for 800ms

    return () => clearTimeout(loadingTimer);
  }, []); // Only run once on mount

  // Performance instrumentation for data fetching
  useEffect(() => {
    performance.mark('dashboard-component-ready');
    console.log('[DASHBOARD-PERF] Component ready');
    
    // Track data fetching if any
    if (business) {
      console.log('[DASHBOARD-PERF] Business data loaded from provider');
    } else {
      console.log('[DASHBOARD-PERF] No business data - using fallback');
    }
    
    // Track first content paint
    setTimeout(() => {
      performance.mark('dashboard-content-paint');
      performance.measure('dashboard-paint-time', 'dashboard-component-ready', 'dashboard-content-paint');
      const paintMeasure = performance.getEntriesByName('dashboard-paint-time')[0];
      console.log(`[DASHBOARD-PERF] Content paint time: ${paintMeasure.duration.toFixed(2)}ms`);
    }, 50);
  }, [business]);

  // Show branded loading screen
  if (showLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center z-50">
        <div className="text-center">
          {/* BLIPP Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BLIPP
              </span>
            </div>
          </div>
          
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto relative">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Loading Your Dashboard</h2>
            <p className="text-gray-600">Preparing your business insights...</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const handleDismissChecklist = () => {
    setShowSetupChecklist(false);
  };

  return (
    <div className={`p-8 space-y-8 transition-enabled transform ${
      isVisible 
        ? 'opacity-100 translate-y-0 scale-100' 
        : 'opacity-0 translate-y-8 scale-95'
    }`}>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Welcome back, {businessName}!</h1>
        <p className="mt-1 text-slate-500">Here's your business performance overview.</p>
      </div>

      {/* Setup Checklist */}
      {showSetupChecklist && (
        <SetupChecklist 
          onQuickSetup={() => window.dispatchEvent(new CustomEvent('openQuickSetup'))}
          onDismiss={handleDismissChecklist}
        />
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, i) => {
          const parseDelta = (txt) => {
            if (!txt) return null;
            const cleaned = String(txt).replace(/[%+]/g, '');
            const num = Number(cleaned);
            return Number.isFinite(num) ? num : null;
          };
          const delta = parseDelta(kpi.change);
          return (
            <Link to={`/${kpi.href}`} key={i}>
              <KpiTile
                title={kpi.title}
                value={kpi.value}
                icon={<kpi.icon className={`w-6 h-6 ${kpi.iconColor}`} />}
                rightSlot={delta !== null ? <StatDelta value={delta} /> : null}
                className={`transition-enabled ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              />
            </Link>
          );
        })}
      </div>

      {/* Mini Stats Row */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Requests Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Sent</span><span>156</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full flex">
                <div className="w-3/5 bg-blue-500 rounded-l-full"></div>
                <div className="w-1/5 bg-yellow-400"></div>
                <div className="w-1/5 bg-green-500 rounded-r-full"></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Delivered: 89</span><span>Responded: 67</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Mini Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-lg font-bold">156</div>
                <div className="text-xs text-slate-500">Requests</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div className="text-center">
                <div className="text-lg font-bold">89</div>
                <div className="text-xs text-slate-500">Reviews</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div className="text-center">
                <div className="text-lg font-bold">23</div>
                <div className="text-xs text-slate-500">New Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Top Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={platformColors.Google}>
                Google (45)
              </Badge>
              <Badge variant="outline" className={platformColors.Yelp}>
                Yelp (28)
              </Badge>
              <Badge variant="outline" className={platformColors.Facebook}>
                Facebook (16)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Reviews</CardTitle>
                         <Button variant="ghost" size="sm" onClick={() => navigate('/review-inbox')}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <div className="space-y-3">
              {recentReviews.map((review, i) => (
                <div key={i} className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-900">{review.customer}</span>
                      <span className="text-xs text-slate-400">â€¢</span>
                      <Badge variant="outline" className={platformColors[review.platform]}>
                        {review.platform}
                      </Badge>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-1">"{review.text}"</p>
                  </div>
                  <span className="text-xs text-slate-400 mt-1">{review.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            {quickActions.map(action => (
                             <Button 
                key={action.label} 
                variant="outline" 
                className="w-full h-20 text-xs border-slate-200 hover:shadow-sm flex flex-col items-center justify-center gap-2 p-3" 
                onClick={() => navigate(`/${action.url}`)}
              >
                <action.icon className={`w-8 h-8 ${action.color}`} />
                <span className="text-center leading-tight font-medium">{action.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


