import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, CheckCircle, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const mockRequests = [
  { id: 1, customer: "Sarah Johnson", channel: "sms", status: "sent", date: "2024-07-20" },
  { id: 2, customer: "Mike Chen", channel: "email", status: "replied", date: "2024-07-19" },
  { id: 3, customer: "David Lee", channel: "sms", status: "sent", date: "2024-07-19" },
];

const AutomatedRequestsPage = () => {
  const [smsTemplate, setSmsTemplate] = useState("Hi {{customer.name}}, thanks for visiting! We'd love to get your feedback. Here's a link to leave a review: {{review_link}}");
  const [emailTemplate, setEmailTemplate] = useState("Subject: Your recent visit\n\nHi {{customer.name}},\n\nWe hope you had a great experience with us. If you have a moment, we would appreciate it if you could leave us a review at the link below.\n\n{{review_link}}\n\nThank you!");
  const [showSmsSaved, setShowSmsSaved] = useState(false);
  const [showEmailSaved, setShowEmailSaved] = useState(false);

  const saveTemplate = (setter) => {
    // In a real app, this would be an API call.
    // Here we just show a visual confirmation.
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Send Review Requests"
        subtitle="Manage templates and send manual requests to customers."
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>SMS Template</CardTitle>
            <CardDescription>
              Used for sending review requests via text message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end mt-4">
              <Button onClick={() => saveTemplate(setShowSmsSaved)} disabled={showSmsSaved}>
                {showSmsSaved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : "Save SMS Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Email Template</CardTitle>
            <CardDescription>
              Used for sending review requests via email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end mt-4">
              <Button onClick={() => saveTemplate(setShowEmailSaved)} disabled={showEmailSaved}>
                {showEmailSaved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : "Save Email Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Sent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.customer}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{req.channel}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'replied' ? 'success' : 'secondary'} className="capitalize">
                      {req.status === 'replied' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{req.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedRequestsPage;