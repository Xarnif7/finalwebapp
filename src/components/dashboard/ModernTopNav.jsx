import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, Repeat, User as UserIcon, HelpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/components/providers/DashboardProvider";
import HelpGuide from "@/components/ui/HelpGuide";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FunctionalNotifications from "@/components/ui/FunctionalNotifications";


const UserAvatar = ({ user, size = "40px" }) => {
  const getInitials = () => {
    // Try to get full name from user metadata first, then fallback to email
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
  const [showHelpGuide, setShowHelpGuide] = React.useState(false);

  const handleSwitchAccount = () => onLogout();
  const goToProfile = () => navigate(createPageUrl('Settings'));
    
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-40">
      {/* Left side - Breadcrumbs */}
      <div className="flex-1">
        <Breadcrumbs />
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-3">
        {/* Help Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHelpGuide(true)}
          className="h-12 w-12 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          title="Help & Setup Guide"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>

        {/* Functional Notifications */}
        <FunctionalNotifications />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <UserAvatar user={user} size="40px" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50">
            <DropdownMenuLabel>My Account {user?.email ? `(${user.email})` : ''}</DropdownMenuLabel>
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

      {/* Help Guide Modal */}
      <HelpGuide 
        isOpen={showHelpGuide} 
        onClose={() => setShowHelpGuide(false)} 
      />
    </header>
  );
}


