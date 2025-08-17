import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, User, Shield, Edit, Trash2, Plus, Send, Star, Users as UsersIcon, MessageSquare, Settings } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/ui/PageHeader";

const actionIcons = {
  "user_invited": UsersIcon, "user_removed": Trash2, "template_updated": Edit, "review_responded": MessageSquare,
  "settings_changed": Settings, "customer_added": Plus, "request_sent": Send, "review_received": Star,
  "login": User, "logout": User
};

const actionColors = {
  "user_invited": "bg-green-100 text-green-800", "user_removed": "bg-red-100 text-red-800",
  "template_updated": "bg-blue-100 text-blue-800", "review_responded": "bg-purple-100 text-purple-800",
  "settings_changed": "bg-orange-100 text-orange-800", "customer_added": "bg-teal-100 text-teal-800",
  "request_sent": "bg-indigo-100 text-indigo-800", "review_received": "bg-yellow-100 text-yellow-800",
};

const mockAuditLogs = [
  { id: "1", user_email: "john@example.com", action: "review_responded", resource: "Review", details: { customer: "Sarah Johnson" }, ip_address: "192.168.1.100", created_date: "2024-01-15T14:30:00Z" },
  { id: "2", user_email: "sarah@example.com", action: "customer_added", resource: "Customer", details: { name: "Mike Chen" }, ip_address: "192.168.1.101", created_date: "2024-01-15T13:45:00Z" },
  { id: "3", user_email: "alex@blipp.com", action: "settings_changed", resource: "Business Profile", details: { field: "name" }, ip_address: "192.168.1.102", created_date: "2024-01-15T11:00:00Z" },
];

export default function AuditLogPage() {
  const [logs] = useState(mockAuditLogs);
  const [filteredLogs, setFilteredLogs] = useState(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  useEffect(() => {
    let filtered = logs.filter(log => 
      (actionFilter === "all" || log.action === actionFilter) &&
      (userFilter === "all" || log.user_email === userFilter) &&
      (searchTerm === "" || JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredLogs(filtered);
  }, [searchTerm, actionFilter, userFilter, logs]);

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueUsers = [...new Set(logs.map(log => log.user_email))];

  return (
    <div className="p-8 space-y-6">
      <PageHeader 
        title="Audit Log"
        subtitle="Track all actions and changes in your business account."
      />

      <Card className="rounded-2xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow min-w-[300px] lg:min-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search actions, users, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(a=>
                    <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(u=>
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border border-slate-200">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log, index) => {
              const ActionIcon = actionIcons[log.action] || Shield;
              return (
                <motion.div
                  key={log.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionColors[log.action] || 'bg-slate-100'}`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{log.user_email} {log.action.replace(/_/g, ' ')} {log.resource}</p>
                    <p className="text-xs text-slate-500">{new Date(log.created_date).toLocaleString()} &bull; IP: {log.ip_address}</p>
                  </div>
                  <Badge variant="outline">{log.action.replace(/_/g, ' ')}</Badge>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

