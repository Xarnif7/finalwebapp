import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/components/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Users, Star, BarChart3, Settings, Zap, MessageCircle,
  ChevronRight, ChevronsLeft, Send, Activity, Repeat, FileText, Compass, Instagram, LayoutDashboard
} from 'lucide-react';
import { navigationGroups } from '@/config/nav';
import { isFeatureEnabled } from '@/lib/featureFlags';

// Icon mapping for navigation items
const iconMap = {
  Users,
  Star,
  BarChart3,
  Settings,
  Zap,
  MessageCircle,
  LayoutDashboard,
  Send,
  Activity,
  Repeat,
  FileText,
  Compass,
  Instagram
};

const BlippLogo = ({ collapsed }) => (
    <div className="flex items-center justify-center p-6 h-20 border-b border-slate-200">
        <Link to="/">
            <AnimatePresence>
                {!collapsed && (
                    <motion.img
                        key="logo-full"
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
                        alt="Blipp Logo"
                        className="h-16 w-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {collapsed && (
                     <motion.img
                        key="logo-collapsed"
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
                        alt="Blipp Logo"
                        className="h-12 w-auto"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                     />
                )}
            </AnimatePresence>
        </Link>
    </div>
);

const NavItem = ({ item, expandedGroups, toggleGroup, collapsed }) => {
    const location = useLocation();
    const isParentActive = item.subItems?.some(sub => location.pathname.includes(sub.url));
    const isActive = !item.subItems && location.pathname.includes(item.url);
    const isGroupOpen = expandedGroups.includes(item.title);

    if (item.subItems) {
        return (
            <div>
                <div
                    className={cn(
                        "group flex items-center justify-between gap-3.5 text-sm font-medium rounded-lg px-4 py-2.5 cursor-pointer transition-all duration-200 relative",
                        isParentActive ? "text-slate-900 bg-slate-100" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                        collapsed && "justify-center"
                    )}
                    onClick={() => toggleGroup(item.title)}
                    title={collapsed ? item.title : ''}
                >
                    {isParentActive && <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#1A73E8] to-[#7C3AED]" />}
                    <div className="flex items-center gap-3.5">
                        {React.createElement(iconMap[item.icon] || Users, { className: "w-6 h-6 shrink-0" })}
                        {!collapsed && <span className="relative">
                            {item.title}
                            <div className="absolute -bottom-1 left-0 h-[2px] w-0 group-hover:w-full transition-[width] duration-250 ease-out rounded-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED]" />
                        </span>}
                    </div>
                    {!collapsed && <ChevronRight className={cn("w-4 h-4 transition-transform", isGroupOpen && "rotate-90")} />}
                </div>
                {!collapsed && isGroupOpen && (
                    <div className="pl-6 mt-1 space-y-1">
                        {item.subItems.map(subItem => (
                            <Link key={subItem.title} to={`/${subItem.url}`}>
                                <div className={cn(
                                    "group px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
                                    location.pathname.includes(subItem.url)
                                        ? "bg-blue-100 text-blue-700 font-semibold"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                )}>
                                    <span className="relative">
                                        {subItem.title}
                                        {!location.pathname.includes(subItem.url) && (
                                            <div className="absolute -bottom-1 left-0 h-[2px] w-0 group-hover:w-full transition-[width] duration-250 ease-out rounded-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED]" />
                                        )}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <Link to={`/${item.url}`} title={collapsed ? item.title : ''}>
            <motion.div
                className={cn(
                    "group flex items-center gap-3.5 text-sm font-medium rounded-lg px-4 py-2.5 transition-all duration-200 relative",
                    isActive 
                        ? "text-slate-900 bg-slate-100 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    collapsed && "justify-center"
                )}
            >
                {isActive && <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#1A73E8] to-[#7C3AED]" />}
                {React.createElement(iconMap[item.icon] || Users, { className: "w-6 h-6 shrink-0" })}
                {!collapsed && <span className="relative">
                    {item.title}
                    {!isActive && (
                        <div className="absolute -bottom-1 left-0 h-[2px] w-0 group-hover:w-full transition-[width] duration-250 ease-out rounded-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED]" />
                    )}
                </span>}
            </motion.div>
        </Link>
    );
};

export default function ModernSidebar() {
    const [expandedGroups, setExpandedGroups] = useState(['Reviews', 'Automations', 'Reporting', 'Settings']);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const storedState = localStorage.getItem('sidebarExpandedGroups');
        if (storedState) setExpandedGroups(JSON.parse(storedState));
        
        const collapseState = localStorage.getItem('blipp.sidebarCollapsed');
        if (collapseState) setCollapsed(JSON.parse(collapseState));
    }, []);

    const toggleGroup = (title) => {
        const newExpanded = expandedGroups.includes(title)
            ? expandedGroups.filter(g => g !== title)
            : [...expandedGroups, title];
        setExpandedGroups(newExpanded);
        localStorage.setItem('sidebarExpandedGroups', JSON.stringify(newExpanded));
    };

    const toggleCollapse = () => {
        const newCollapsedState = !collapsed;
        setCollapsed(newCollapsedState);
        localStorage.setItem('blipp.sidebarCollapsed', JSON.stringify(newCollapsedState));
    }

    return (
        <motion.aside 
            className="flex-col bg-white border-r border-slate-200 h-full flex"
            animate={{ width: collapsed ? 88 : 256 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
        >
            <BlippLogo collapsed={collapsed} />
            <nav className="flex-1 px-4 py-6 space-y-6">
                {navigationGroups.map((group) => (
                    <div key={group.title}>
                        {!collapsed && <h3 className="px-4 mb-2 text-xs font-semibold uppercase text-slate-400 tracking-wider">{group.title}</h3>}
                        <div className="space-y-1">
                            {group.items
                                .filter(item => !item.featureFlag || isFeatureEnabled(item.featureFlag))
                                .map((item) => (
                                <NavItem key={item.title} item={item} expandedGroups={expandedGroups} toggleGroup={toggleGroup} collapsed={collapsed} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="border-t border-slate-200 p-4">
                <Button variant="ghost" className="w-full justify-center" onClick={toggleCollapse}>
                    <ChevronsLeft className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")} />
                </Button>
            </div>
        </motion.aside>
    );
}


