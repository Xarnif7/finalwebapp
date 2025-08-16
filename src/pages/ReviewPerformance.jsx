
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Clock, MessageSquare, Filter, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const platformColors = {
  Google: "bg-white text-purple-600 border-purple-200 hover:bg-purple-50 transition-colors",
  Yelp: "bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors", 
  Facebook: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
};

const kpiData = [
  {
    title: "Your Average Rating",
    value: "4.8",
    change: "+0.3 from last month",
    icon: Star,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600"
  },
  {
    title: "Total Reviews",
    value: "247",
    change: "+42 from last month",
    icon: TrendingUp,
    bgColor: "bg-green-50",
    borderColor: "border-green-200", 
    iconColor: "text-green-600"
  },
  {
    title: "Response Time",
    value: "2.4h",
    change: "-30min improvement",
    icon: Clock,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600"
  },
  {
    title: "Reply Rate",
    value: "94%",
    change: "+8% from last month",
    icon: MessageSquare,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600"
  },
];

const platformBreakdown = [
  { platform: "Google", reviews: 142, rating: 4.9, color: "bg-white text-[#1A73E8] border-blue-200" },
  { platform: "Yelp", reviews: 68, rating: 4.6, color: "bg-white text-[#D32323] border-red-200" },
  { platform: "Facebook", reviews: 37, rating: 4.7, color: "bg-white text-[#1877F2] border-blue-200" },
];

export default function ReviewPerformance() {
  const [timeRange, setTimeRange] = useState("30");

  return (
    <motion.div 
      className="p-8 space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader 
        title="Review Performance" 
        subtitle="Track ratings, volume, and response trends across platforms"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, i) => (
          <Card key={i} className={`${kpi.bgColor} ${kpi.borderColor} border rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]`}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1 leading-tight">{kpi.value}</div>
              <div className="text-xs text-slate-500 mb-1">{kpi.title}</div>
              <div className="text-[11px] text-emerald-600 font-medium">{kpi.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Breakdown */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {platformBreakdown.map((platform, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-slate-50">
                <Badge className={`mb-2 ${platform.color}`}>{platform.platform}</Badge>
                <div className="text-2xl font-bold text-slate-900">{platform.reviews}</div>
                <div className="text-sm text-slate-500 mb-1">Total Reviews</div>
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{platform.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trends Chart Placeholder */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Rating Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Trend chart visualization would go here</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
