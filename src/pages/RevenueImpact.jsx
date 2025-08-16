import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, Target, ArrowUp, ArrowDown, Calculator } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const impactMetrics = [
  {
    title: "Current Monthly Revenue",
    value: "$47,200",
    change: "+12%",
    icon: DollarSign,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600"
  },
  {
    title: "New Customers Attributed",
    value: "23",
    change: "+8",
    icon: Users,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600"
  },
  {
    title: "Average Customer LTV",
    value: "$2,050",
    change: "+15%",
    icon: Target,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600"
  },
  {
    title: "Projected LTV Growth",
    value: "$78,150",
    change: "+24%",
    icon: TrendingUp,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconColor: "text-orange-600"
  }
];

const revenueBreakdown = [
  { source: "Google Reviews", amount: "$18,500", percentage: 39, color: "bg-blue-500" },
  { source: "Yelp Reviews", amount: "$12,300", percentage: 26, color: "bg-red-500" },
  { source: "Facebook Reviews", amount: "$8,900", percentage: 19, color: "bg-indigo-500" },
  { source: "Word of Mouth", amount: "$7,500", percentage: 16, color: "bg-green-500" }
];

export default function RevenueImpactPage() {
  const [simulatorValues, setSimulatorValues] = useState({
    reviewIncrease: 25,
    ratingImprovement: 0.3,
    conversionBoost: 15
  });

  const calculateProjection = () => {
    const baseRevenue = 47200;
    const multiplier = (100 + simulatorValues.reviewIncrease + simulatorValues.conversionBoost) / 100;
    return Math.round(baseRevenue * multiplier);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Revenue Impact"
        subtitle="Track how reviews drive revenue growth and project future earnings."
      />

      {/* Impact Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {impactMetrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`${metric.bgColor} ${metric.borderColor} border rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
                  </div>
                  {metric.change.startsWith('+') ? (
                    <ArrowUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{metric.value}</div>
                <div className="text-xs text-slate-500 mb-1">{metric.title}</div>
                <div className="text-[11px] text-emerald-600 font-medium">{metric.change} vs last month</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Sources */}
        <Card className="lg:col-span-1 rounded-2xl">
          <CardHeader>
            <CardTitle>Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueBreakdown.map((source, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{source.source}</span>
                  <span className="text-sm text-slate-600">{source.amount}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={`${source.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500">{source.percentage}% of total</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Impact Simulator */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <CardTitle>Revenue Impact Simulator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Review Volume Increase (%)</Label>
                <Input 
                  type="number" 
                  value={simulatorValues.reviewIncrease}
                  onChange={(e) => setSimulatorValues({...simulatorValues, reviewIncrease: parseInt(e.target.value) || 0})}
                  className="text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>Rating Improvement</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={simulatorValues.ratingImprovement}
                  onChange={(e) => setSimulatorValues({...simulatorValues, ratingImprovement: parseFloat(e.target.value) || 0})}
                  className="text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>Conversion Rate Boost (%)</Label>
                <Input 
                  type="number" 
                  value={simulatorValues.conversionBoost}
                  onChange={(e) => setSimulatorValues({...simulatorValues, conversionBoost: parseInt(e.target.value) || 0})}
                  className="text-center"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-sm text-slate-600 mb-2">Projected Monthly Revenue</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ${calculateProjection().toLocaleString()}
                </div>
                <div className="text-sm text-green-600 mt-2">
                  +${(calculateProjection() - 47200).toLocaleString()} increase
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">47</div>
                <div className="text-xs text-slate-500">New Customers/Month</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">$2,380</div>
                <div className="text-xs text-slate-500">Avg Customer Value</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">18 mo</div>
                <div className="text-xs text-slate-500">Customer Lifespan</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}