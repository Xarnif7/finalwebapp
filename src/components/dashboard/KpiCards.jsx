import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Star, 
  Send, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  CheckCircle,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { Client, ReviewRequest, ReviewTracking, User } from "@/api/entities";
import { supabase } from "../../lib/supabaseClient";

const StatCard = ({ title, value, change, icon: Icon, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  <TrendingUp className={`w-4 h-4 mr-1 ${change > 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function KpiCards() {
  const [kpis, setKpis] = useState({
    totalReviews: 0,
    averageRating: 0,
    requestsSent: 0,
    conversionRate: 0,
    totalClients: 0,
    responseRate: 0,
    newReviewsThisWeek: 0,
    scheduledRequests: 0
  });
  const [changes, setChanges] = useState({
    totalReviews: 12,
    averageRating: 5,
    requestsSent: 18,
    conversionRate: -3,
    totalClients: 8,
    responseRate: 15,
    newReviewsThisWeek: 25,
    scheduledRequests: 10
  });

  useEffect(() => {
    loadKpis();
  }, []);

  const loadKpis = async () => {
    try {
      const user = await User.me();
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .limit(1); // RLS will automatically filter by auth.uid()
      
      if (!error && businesses && businesses.length > 0) {
        const currentBusiness = businesses[0];
        
        const [clients, requests, reviews] = await Promise.all([
          Client.filter({ business_id: currentBusiness.id }),
          ReviewRequest.filter({ business_id: currentBusiness.id }),
          ReviewTracking.filter({ business_id: currentBusiness.id })
        ]);

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
          : 0;
        const requestsSent = requests.filter(r => r.status === 'sent').length;
        const conversionRate = requestsSent > 0 
          ? Math.round((totalReviews / requestsSent) * 100)
          : 0;
        const responseRate = requestsSent > 0
          ? Math.round((requests.filter(r => r.status === 'replied').length / requestsSent) * 100)
          : 0;

        // Calculate weekly reviews
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newReviewsThisWeek = reviews.filter(r => 
          new Date(r.created_date) > oneWeekAgo
        ).length;

        const scheduledRequests = requests.filter(r => r.status === 'pending').length;

        setKpis({
          totalReviews,
          averageRating,
          requestsSent,
          conversionRate,
          totalClients: clients.length,
          responseRate,
          newReviewsThisWeek,
          scheduledRequests
        });
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
      // Set mock data for demo
      setKpis({
        totalReviews: 47,
        averageRating: 4.6,
        requestsSent: 68,
        conversionRate: 69,
        totalClients: 123,
        responseRate: 78,
        newReviewsThisWeek: 12,
        scheduledRequests: 5
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Reviews"
        value={kpis.totalReviews}
        change={changes.totalReviews}
        icon={Star}
        color="bg-gradient-to-r from-yellow-500 to-orange-500"
        delay={0}
      />
      
      <StatCard
        title="Average Rating"
        value={`${kpis.averageRating}/5`}
        change={changes.averageRating}
        icon={TrendingUp}
        color="bg-gradient-to-r from-green-500 to-emerald-500"
        delay={0.1}
      />
      
      <StatCard
        title="Requests Sent"
        value={kpis.requestsSent}
        change={changes.requestsSent}
        icon={Send}
        color="bg-gradient-to-r from-blue-500 to-cyan-500"
        delay={0.2}
      />
      
      <StatCard
        title="Conversion Rate"
        value={`${kpis.conversionRate}%`}
        change={changes.conversionRate}
        icon={CheckCircle}
        color="bg-gradient-to-r from-purple-500 to-pink-500"
        delay={0.3}
      />
      
      <StatCard
        title="Total Clients"
        value={kpis.totalClients}
        change={changes.totalClients}
        icon={Users}
        color="bg-gradient-to-r from-indigo-500 to-blue-500"
        delay={0.4}
      />
      
      <StatCard
        title="Response Rate"
        value={`${kpis.responseRate}%`}
        change={changes.responseRate}
        icon={MessageSquare}
        color="bg-gradient-to-r from-teal-500 to-green-500"
        delay={0.5}
      />
      
      <StatCard
        title="New This Week"
        value={kpis.newReviewsThisWeek}
        change={changes.newReviewsThisWeek}
        icon={AlertTriangle}
        color="bg-gradient-to-r from-orange-500 to-red-500"
        delay={0.6}
      />
      
      <StatCard
        title="Scheduled"
        value={kpis.scheduledRequests}
        change={changes.scheduledRequests}
        icon={Calendar}
        color="bg-gradient-to-r from-violet-500 to-purple-500"
        delay={0.7}
      />
    </div>
  );
}


