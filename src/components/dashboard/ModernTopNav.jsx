import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, Repeat, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/components/providers/DashboardProvider";

const mockNotifications = [
    { text: "New 5-star review from Sarah L.", time: "2m ago", route: "ReviewInbox" },
    { text: "Customer 'Mike T.' replied via SMS.", time: "1h ago", route: "Conversations" },
    { text: "12 review requests were sent.", time: "3h ago", route: "AutomatedRequests" },
    { text: "New customer added: Emily R.", time: "5h ago", route: "Clients" },
];

const UserAvatar = ({ user, size = "40px" }) => {
  const getInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div 
      className="bg-gradient-to-r from-[#1A73E8] to-[#7C3AED] text-white rounded-full flex items-center justify-center font-semibold text-sm ring-2 ring-transparent group-hover:ring-purple-300 group-focus:ring-purple-400 transition-all"
      style={{ width: size, height: size }}
    >
      {getInitials()}
    </div>
  );
};

export default function ModernTopNav({ onLogout }) {
  const navigate = useNavigate();
  const { user } = useDashboard();

  const handleSwitchAccount = () => onLogout();
  const goToProfile = () => navigate(createPageUrl('Settings'));
  const handleNotificationClick = (route) => navigate(createPageUrl(route));
  const viewAllNotifications = () => navigate(createPageUrl('AuditLog'));
    
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-end z-40">
      <div className="flex items-center gap-3">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-12 w-12">
                  <Bell className="w-5 h-5 text-slate-500" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white">
                    {mockNotifications.length}
                  </Badge>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 z-50">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {mockNotifications.map((n, index) => (
                    <DropdownMenuItem key={index} className="flex flex-col items-start p-3 cursor-pointer" onClick={() => handleNotificationClick(n.route)}>
                        <p className="text-sm text-slate-700">{n.text}</p>
                        <span className="text-xs text-slate-400">{n.time}</span>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <button onClick={viewAllNotifications} className="w-full text-center text-blue-600 font-semibold py-2 cursor-pointer">
                        View all notifications
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group" aria-label="User menu">
                <UserAvatar user={user} size="40px" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={goToProfile} className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer">
                <Repeat className="mr-2 h-4 w-4" />Switch Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


