import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/components/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Users, Star, BarChart3, Settings, Zap, MessageCircle,
  ChevronsLeft, Send, Activity, Repeat, FileText, Compass, Instagram, LayoutDashboard
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
                        src="/images/blipp-logo.svg"
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
                        src="/images/blipp-logo.svg"
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

const NavItem = ({ item, collapsed }) => {
    const location = useLocation();
    const isParentActive = item.subItems?.some(sub => location.pathname.includes(sub.url));
    const isActive = !item.subItems && location.pathname.includes(item.url);

    return (
        <Link to={`/${item.url}`} title={collapsed ? item.title : ''}>
            <motion.div
                className={cn(
                    "group flex items-center gap-3.5 text-sm font-medium rounded-lg px-4 py-2.5 transition-all duration-200 relative",
                    (isActive || isParentActive)
                        ? "text-slate-900 bg-slate-100 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    collapsed && "justify-center"
                )}
            >
                {(isActive || isParentActive) && <div className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#1A73E8] to-[#7C3AED]" />}
                {React.createElement(iconMap[item.icon] || Users, { className: "w-6 h-6 shrink-0" })}
                {!collapsed && <span className="relative">
                    {item.title}
                    {!(isActive || isParentActive) && (
                        <div className="absolute -bottom-1 left-0 h-[2px] w-0 group-hover:w-full transition-[width] duration-250 ease-out rounded-full bg-gradient-to-r from-[#1A73E8] to-[#7C3AED]" />
                    )}
                </span>}
            </motion.div>
        </Link>
    );
};

export default function ModernSidebar() {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const collapseState = localStorage.getItem('blipp.sidebarCollapsed');
        if (collapseState) setCollapsed(JSON.parse(collapseState));
    }, []);

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
                                <NavItem key={item.title} item={item} collapsed={collapsed} />
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


