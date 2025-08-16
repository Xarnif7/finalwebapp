import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Star, BarChart, TrendingUp, Award } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const kpiData = [
  { title: "Your Rating", value: "4.9", tint: 'bg-yellow-100/60' },
  { title: "Your Reviews", value: "1,204", tint: 'bg-green-100/60' },
  { title: "Avg. Competitor Rating", value: "4.6", tint: 'bg-blue-100/60' },
  { title: "Market Position", value: "#1", tint: 'bg-purple-100/60' },
];

const competitorsData = [
  {
    name: "Dental Bright",
    rating: 4.8,
    reviews: 987,
    trend: "+12",
    position: "#2",
  },
  {
    name: "Smile High Dental",
    rating: 4.5,
    reviews: 754,
    trend: "+8",
    position: "#3",
  },
  {
    name: "City Center Dentistry",
    rating: 4.4,
    reviews: 621,
    trend: "-2",
    position: "#4",
  },
];

const chartData = [
    { name: 'Jan', you: 4.8, competitor: 4.6 },
    { name: 'Feb', you: 4.8, competitor: 4.6 },
    { name: 'Mar', you: 4.9, competitor: 4.7 },
    { name: 'Apr', you: 4.9, competitor: 4.6 },
    { name: 'May', you: 4.9, competitor: 4.7 },
    { name: 'Jun', you: 4.9, competitor: 4.8 },
];

const CompetitorsPage = () => {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Competitor Tracking"
          subtitle="See how your business stacks up against the competition."
        />
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Add Competitor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className={`rounded-2xl ${kpi.tint} h-[112px]`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Rating Trend vs. Top Competitor</CardTitle>
          <CardDescription>
            Your average rating compared to Dental Bright over the last 6 months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                  <linearGradient id="you" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/><stop offset="95%" stopColor="#8884d8" stopOpacity={0}/></linearGradient>
                  <linearGradient id="competitor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/><stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="name" />
              <YAxis domain={[4, 5]} />
              <Tooltip />
              <Area type="monotone" dataKey="you" stroke="#8884d8" fill="url(#you)" />
              <Area type="monotone" dataKey="competitor" stroke="#82ca9d" fill="url(#competitor)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Competitor Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>30d Trend</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitorsData.map((c) => (
                <TableRow key={c.name}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.rating}</TableCell>
                  <TableCell>{c.reviews}</TableCell>
                  <TableCell className={c.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}>{c.trend}</TableCell>
                  <TableCell>{c.position}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitorsPage;
