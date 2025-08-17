import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Zap } from "lucide-react";

export default function ReviewMetrics({ stats }) {
  const openRate = stats.totalRequests > 0 ? (stats.emailsOpened / stats.totalRequests) * 100 : 0;
  const clickRate = stats.emailsOpened > 0 ? (stats.linksClicked / stats.emailsOpened) * 100 : 0;
  const overallSuccess = stats.totalRequests > 0 ? (stats.linksClicked / stats.totalRequests) * 100 : 0;

  const metrics = [
    {
      label: "Email Open Rate",
      value: Math.round(openRate),
      target: 70,
      icon: Target,
      color: "text-blue-600"
    },
    {
      label: "Click Through Rate", 
      value: Math.round(clickRate),
      target: 25,
      icon: Zap,
      color: "text-green-600"
    },
    {
      label: "Overall Success",
      value: Math.round(overallSuccess), 
      target: 20,
      icon: TrendingUp,
      color: "text-purple-600"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
                <span className="font-medium text-gray-900">{metric.label}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-900">{metric.value}%</span>
                <span className="text-sm text-gray-500 ml-2">/ {metric.target}% target</span>
              </div>
            </div>
            <Progress 
              value={metric.value} 
              className="h-2"
            />
            <p className="text-xs text-gray-500">
              {metric.value >= metric.target ? 
                "âœ… Exceeding industry average" : 
                `${metric.target - metric.value}% to reach target`
              }
            </p>
          </div>
        ))}
        
        {stats.totalRequests === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Send your first review requests to see metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

