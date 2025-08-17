import React from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, CheckCircle, MousePointer, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  scheduled: {
    icon: Clock,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    label: "Scheduled"
  },
  sent: {
    icon: Mail,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Sent"
  },
  opened: {
    icon: CheckCircle,
    color: "bg-green-50 text-green-700 border-green-200", 
    label: "Opened"
  },
  clicked: {
    icon: MousePointer,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    label: "Clicked"
  },
  failed: {
    icon: AlertCircle,
    color: "bg-red-50 text-red-700 border-red-200",
    label: "Failed"
  }
};

export default function RecentActivity({ requests }) {
  if (requests.length === 0) {
      return (
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No review requests yet</p>
          <p className="text-sm text-gray-400 mt-1">Start by adding some clients!</p>
        </div>
      )
  }
  
  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const status = statusConfig[request.status] || statusConfig.sent;
        const StatusIcon = status.icon;
        
        return (
          <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <StatusIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Review Request</p>
                <p className="text-sm text-gray-500">
                  {request.sent_date ? format(new Date(request.sent_date), "MMM d, h:mm a") : "Scheduled"}
                </p>
              </div>
            </div>
            <Badge className={`${status.color} border`}>
              {status.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

