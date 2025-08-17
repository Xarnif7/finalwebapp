
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, TrendingUp, MessageSquare, Plus, ArrowRight, Zap, Shield, BarChart3, Send, Clock, Settings, Instagram, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboard } from "@/components/providers/DashboardProvider";

const kpiData = [
  { 
    title: "Total Reviews", 
    value: "89", 
    change: "+12%", 
    icon: Star, 
    bgColor: "bg-yellow-50", 
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    href: "ReviewPerformance"
  },
  { 
    title: "Average Rating", 
    value: "4.8/5", 
    change: "+0.2", 
    icon: TrendingUp, 
    bgColor: "bg-green-50", 
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    href: "ReviewPerformance"
  },
  { 
    title: "Response Rate", 
    value: "87%", 
    change: "+5%", 
    icon: MessageSquare, 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    href: "ReviewPerformance"
  },
  { 
    title: "Revenue Impact", 
    value: "$47K", 
    change: "+$8K", 
    icon: BarChart3, 
    bgColor: "bg-purple-50", 
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
    href: "RevenueImpact"
  },
];

const recentReviews = [
  { platform: "Google", rating: 5, text: "Amazing service! Will come back.", time: "2h ago", customer: "Sarah J." },
  { platform: "Yelp", rating: 5, text: "The team was so professional.", time: "1d ago", customer: "Mike C." },
  { platform: "Facebook", rating: 4, text: "Good experience overall.", time: "2d ago", customer: "Emily R." },
  { platform: "Google", rating: 5, text: "Highly recommend this business!", time: "3d ago", customer: "David L." },
];

const quickActions = [
  { label: 'Add Customer', icon: Plus, url: 'Clients', color: 'text-green-600' },
  { label: 'Send Request', icon: Send, url: 'AutomatedRequests', color: 'text-blue-600' },
  { label: 'View Messages', icon: MessageSquare, url: 'Conversations', color: 'text-purple-600' },
  { label: 'Integrations', icon: Shield, url: 'Integrations', color: 'text-orange-600' },
  { label: 'Review Inbox', icon: Star, url: 'ReviewInbox', color: 'text-yellow-600' },
  { label: 'Revenue Impact', icon: BarChart3, url: 'RevenueImpact', color: 'text-indigo-600' },
  { label: 'Social Posts', icon: Instagram, url: 'SocialPosts', color: 'text-pink-600' },
  { label: 'Competitors', icon: Compass, url: 'Competitors', color: 'text-teal-600' },
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
  const businessName = business?.name || "Your Business";

  return (
    <motion.div 
      className="p-8 space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Welcome back, {businessName}!</h1>
        <p className="mt-1 text-slate-500">Here's your business performance overview.</p>
      </div>

      <motion.div 
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.1, staggerChildren: 0.1 }}
      >
        {kpiData.map((kpi, i) => (
          <Link to={createPageUrl(kpi.href)} key={i}>
            <Card 
              className={`${kpi.bgColor} ${kpi.borderColor} border rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] cursor-pointer`}
            >
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.iconColor}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1 leading-tight">{kpi.value}</div>
                <div className="text-xs text-slate-500 mb-1">{kpi.title}</div>
                <div className="text-[11px] text-emerald-600 font-medium">{kpi.change} vs last month</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>

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
            <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('ReviewInbox'))}>
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
                onClick={() => navigate(createPageUrl(action.url))}
              >
                <action.icon className={`w-8 h-8 ${action.color}`} />
                <span className="text-center leading-tight font-medium">{action.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}


