
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, MessageSquare, Mail, Eye, MousePointer, X, Loader2 } from "lucide-react";
import { Client, ReviewRequest, User } from "@/api/entities";
import { supabase } from "../lib/supabase/browser";
import { sendRequest } from "@/api/functions"; // Use default import
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import ReviewsInbox from "./ReviewsInbox";
import ReviewImporter from "../components/reviews/ReviewImporter";

const statusConfig = {
  scheduled: { color: "bg-yellow-100 text-yellow-800", label: "Scheduled" },
  sent: { color: "bg-blue-100 text-blue-800", label: "Sent" },
  opened: { color: "bg-green-100 text-green-800", label: "Opened" },
  clicked: { color: "bg-purple-100 text-purple-800", label: "Clicked" },
  failed: { color: "bg-red-100 text-red-800", label: "Failed" }
};

export default function ReviewsPage() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [error, setError] = useState(null);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");

  useEffect(() => {
    setIsLoading(true);
    loadData()
      .catch((error) => {
        console.error("Page initialization failed:", error);
        setError("Failed to load review requests. Please try refreshing.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      setFilteredRequests(requests);
    } else {
      const searchLower = searchTerm.toLowerCase().trim();

      const filteredClientsList = clients.filter(client =>
        client.first_name?.toLowerCase().includes(searchLower) ||
        client.last_name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower)
      );

      const filteredRequestsList = requests.filter(request => {
        const client = clients.find(c => c.id === request.client_id);
        if (!client) return false;
        return (
          client.first_name?.toLowerCase().includes(searchLower) ||
          client.last_name?.toLowerCase().includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower)
        );
      });

      setFilteredClients(filteredClientsList);
      setFilteredRequests(filteredRequestsList);
    }
  }, [clients, requests, searchTerm]);

  const loadData = async () => {
    try {
      const user = await User.me();

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .limit(1); // RLS will automatically filter by auth.uid()
      
      if (!error && businesses && businesses.length > 0) {
        const currentBusiness = businesses[0];
        setBusiness(currentBusiness);

        const clientData = await Client.filter({ business_id: currentBusiness.id }, "-created_date");
        const requestData = await ReviewRequest.filter({ business_id: currentBusiness.id }, "-created_date");

        setClients(clientData);
        setRequests(requestData);

        // Load reviews
        try {
          const response = await fetch(`/api/reviews?business_id=${currentBusiness.id}`);
          const data = await response.json();
          setReviews(data.reviews || []);
        } catch (error) {
          console.error("Error loading reviews:", error);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  };

  const handleSendRequest = async (clientId, method = 'email') => {
    if (sendingTo) return;

    setSendingTo(clientId);
    setError(null);
    try {
      // The function call now correctly uses the default import
      const { data, error: funcError } = await sendRequest({
        clientId,
        businessId: business.id,
        method
      });

      if (funcError || !data?.success) {
        throw new Error(funcError?.error || data?.error || "An unknown error occurred.");
      }

      await loadData();
    } catch (e) {
      console.error("Failed to send request:", e);
      setError(e.message || "An unknown error occurred.");
    } finally {
      setSendingTo(null);
    }
  };

  const handleReviewAdded = (newReview) => {
    setReviews([newReview, ...reviews]);
  };

  if (isLoading) {
     return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
            <p className="text-gray-600 mt-1">Manage your reviews and send requests</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-8 mt-6">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "inbox"
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Review Inbox ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "requests"
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Send Requests ({requests.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex">
        {activeTab === "inbox" ? (
          reviews.length > 0 ? (
            <ReviewsInbox />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <ReviewImporter businessId={business?.id} onReviewAdded={handleReviewAdded} />
            </div>
          )
        ) : (
          <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg relative flex items-center justify-between"
                role="alert"
              >
                <div>
                  <strong className="font-bold">Request Failed: </strong>
                  <span className="block sm:inline">{error}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setError(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            <div className="max-w-md">
              <Input
                placeholder="Search by client name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" />
                    Send New Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredClients.length === 0 && (
                    <p className="text-gray-500">
                      {searchTerm ? "No clients found matching your search." : "No clients found. Add clients first to send review requests."}
                    </p>
                  )}
                  {filteredClients.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Last Service</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(showAllClients ? filteredClients : filteredClients.slice(0, 10)).map((client) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">
                                {client.first_name} {client.last_name}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {client.email && <div className="text-sm">{client.email}</div>}
                                  {client.phone && <div className="text-xs text-gray-500">{client.phone}</div>}
                                </div>
                              </TableCell>
                              <TableCell>
                                {client.service_date ? format(new Date(client.service_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendRequest(client.id, 'email')}
                                    disabled={sendingTo !== null || !client.email}
                                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                                  >
                                    {sendingTo === client.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4" />}
                                    Email
                                  </Button>
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendRequest(client.id, 'sms')}
                                      disabled={sendingTo !== null || !client.phone}
                                      className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                    >
                                      {sendingTo === client.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <MessageSquare className="w-4 h-4" />}
                                      SMS
                                    </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {filteredClients.length > 10 && !showAllClients && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setShowAllClients(true)}>
                            View All {filteredClients.length} Clients
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Request History</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm ? "No requests found matching your search." : "No requests sent yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date Sent</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Performance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(showAllRequests ? filteredRequests : filteredRequests.slice(0, 10)).map((request) => {
                            const client = clients.find(c => c.id === request.client_id);
                            const status = statusConfig[request.status] || statusConfig.sent;

                            return (
                              <TableRow key={request.id}>
                                <TableCell>
                                  {request.sent_date ? format(new Date(request.sent_date), 'MMM d, h:mm a') : 'Scheduled'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {client ? `${client.first_name} ${client.last_name}` : 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {request.email_sent ? <Mail className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-purple-600" />}
                                    <span className="text-sm">{request.email_sent ? 'Email' : 'SMS'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${status.color} border`}>
                                    {status.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3 text-sm">
                                    {request.email_opened && (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <Eye className="w-3 h-3" />
                                        Opened
                                      </div>
                                    )}
                                    {request.review_link_clicked && (
                                      <div className="flex items-center gap-1 text-purple-600">
                                        <MousePointer className="w-3 h-3" />
                                        Clicked
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      
                      {filteredRequests.length > 10 && !showAllRequests && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => setShowAllRequests(true)}>
                            View All {filteredRequests.length} Requests
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}


