import React, { useMemo, useState } from "react";
import { Settings, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import SettingsModal from "@/components/settings/SettingsModal";
import ShortcutsOverlay from "@/components/layout/ShortcutsOverlay";
import UpgradeModal from "@/components/modals/UpgradeModal";

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const location = useLocation();
  const title = useMemo(()=>{
    if (!location.pathname.startsWith('/pro')) return 'Blipp';
    const seg = location.pathname.split('/')[2] || 'home';
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  },[location.pathname]);
  return (
    <header className="isolate sticky top-0 z-50 h-16 backdrop-blur-xl bg-gradient-to-r from-[#4BC9F0]/20 via-white/20 to-[#7A5FFF]/20 supports-[backdrop-filter]:from-[#4BC9F0]/15 supports-[backdrop-filter]:to-[#7A5FFF]/15 border-b border-white/15 shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
      <div className="h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="rounded-lg px-3 py-1.5 hover:bg-white/40 transition-colors">Menu</button>
          <div>
            <div className="font-semibold tracking-tight text-slate-900">{title}</div>
            <div className="text-xs text-slate-600">Manage your workspace</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
          <div className="w-full max-w-md relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">/</span>
            <input placeholder="Search or type /" className="w-full rounded-xl pl-8 pr-3 py-2 ring-1 ring-slate-200 bg-white/70 backdrop-blur outline-none focus:ring-slate-300" onKeyDown={(e)=>{ if(e.key==='/'){ e.preventDefault(); } if(e.key==='?'){ e.preventDefault(); setShortcuts(true);} }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setUpgrade(true)} className="hidden sm:inline-flex rounded-xl px-3 py-2 bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] text-white shadow-sm">Upgrade</button>
          <div className="relative">
            <Bell className="h-5 w-5 text-slate-700" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
          </div>
          <HelpCircle className="h-5 w-5 text-slate-700" />
          <button onClick={()=>setUserMenu(v=>!v)} className="relative flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/40">
            <img src="/favicon-32x32.png" alt="avatar" className="h-6 w-6 rounded-full" />
            <ChevronDown className="h-4 w-4" />
          </button>
          <button onClick={()=>setOpen(true)} className="rounded-lg p-2 hover:bg-white/40 transition-colors" aria-label="Open settings">
            <Settings className="h-5 w-5" />
          </button>
          {userMenu && (
            <div className="absolute right-4 top-14 z-[60] rounded-xl bg-white ring-1 ring-slate-200 shadow-lg w-48">
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">Profile</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">Switch account</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">Sign out</button>
            </div>
          )}
        </div>
      </div>
      <SettingsModal open={open} onClose={()=>setOpen(false)} />
      <ShortcutsOverlay open={shortcuts} onClose={()=>setShortcuts(false)} />
      <UpgradeModal open={upgrade} onClose={()=>setUpgrade(false)} />
    </header>
  );
}


