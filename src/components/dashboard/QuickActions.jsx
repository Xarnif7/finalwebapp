import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Send, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActions() {
  const actions = [
    {
      title: "Add New Client",
      description: "Manually add a client for review requests",
      icon: Plus,
      url: "Clients",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Import Clients",
      description: "Upload CSV file with client data",
      icon: Upload,
      url: "Clients", // Stays on clients page, opens dialog
      color: "text-green-500",
      bg: "bg-green-50"
    },
    {
      title: "Send Review Requests",
      description: "Send requests via Email or SMS",
      icon: Send,
      url: "Reviews",
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      title: "Business Settings",
      description: "Update templates and preferences",
      icon: Settings,
      url: "Settings",
      color: "text-orange-500",
      bg: "bg-orange-50"
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <Link to={createPageUrl(action.url)} key={action.title} className="block hover:bg-gray-50 p-3 rounded-lg -m-1 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.bg} flex-shrink-0`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{action.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

