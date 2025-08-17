import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Users, TrendingUp, UserCheck, Search, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Client, Business } from "@/api/entities";
import { useDashboard } from "@/components/providers/DashboardProvider";
import ClientTable from "../components/clients/ClientTable";
import ClientForm from "../components/clients/ClientForm";
import CsvImportDialog from "../components/clients/CsvImportDialog";
import PageHeader from "@/components/ui/PageHeader";
import SendMessageModal from "../components/clients/SendMessageModal";
import { toast } from "react-hot-toast";

const kpiData = [
  {
    title: "Total Customers",
    value: "1,247",
    change: "+12%",
    icon: Users,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600"
  },
  {
    title: "New This Month", 
    value: "89",
    change: "+23%",
    icon: TrendingUp,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600"
  },
  {
    title: "Conversion Rate",
    value: "87%",
    change: "+5%",
    icon: UserCheck,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600"
  }
];

export default function ClientsPage() {
  const { business } = useDashboard();
  const [clients, setClients] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageMode, setMessageMode] = useState(null);

  useEffect(() => {
    if (business?.id) {
      loadClients();
    }
  }, [business]);

  const loadClients = async () => {
    const fetchedClients = await Client.filter({ business_id: business.id });
    setClients(fetchedClients);
  };

  const handleAddClient = async (clientData) => {
    const newClient = await Client.create({ ...clientData, business_id: business.id });
    setClients(prev => [newClient, ...prev]);
    setShowAddForm(false);
  };

  const handleImportSuccess = () => {
    loadClients();
    setShowImport(false);
  };

  const handleSendMessage = (client, mode) => {
    setSelectedClient(client);
    setMessageMode(mode);
  };

  const handleDeleteClient = async (client) => {
    if (window.confirm(`Are you sure you want to delete ${client.first_name} ${client.last_name}? This action cannot be undone.`)) {
      try {
        await Client.delete(client.id);
        setClients(prev => prev.filter(c => c.id !== client.id));
        toast.success('Customer deleted successfully');
      } catch (error) {
        toast.error('Failed to delete customer');
      }
    }
  };

  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name} ${client.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedClients = showAll ? filteredClients : filteredClients.slice(0, 10);

  return (
    <motion.div 
      className="p-8 space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader 
        title="Customers" 
        subtitle="Manage your customer database and track engagement"
      />

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-6">
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
              <div className="text-[11px] text-emerald-600 font-medium">{kpi.change} vs last month</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Customers ({filteredClients.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ClientTable 
            clients={displayedClients} 
            onSendMessage={handleSendMessage} 
            onDeleteClient={handleDeleteClient}
          />
          {!showAll && filteredClients.length > 10 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setShowAll(true)}>
                Show All Customers ({filteredClients.length - 10} more)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <ClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showImport && (
        <CsvImportDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImportSuccess={handleImportSuccess}
          businessId={business?.id}
        />
      )}
      
      <SendMessageModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        businessId={business?.id}
        mode={messageMode}
      />
    </motion.div>
  );
}

